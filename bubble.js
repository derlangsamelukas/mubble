
export function create(wellItsABubble, saveMe, removeMe, diveInto){
    let subscribed = false
    const bubblee = Object.assign({}, wellItsABubble)
    const nodes = {
        point: createPoint(bubblee),
        bubble: createBubbleNode(bubblee),
        text: createText(bubblee)
    }

    nodes.point.appendChild(nodes.bubble)
    nodes.point.appendChild(nodes.text)
    moveAndScale(bubblee, nodes)

    bubbleup(nodes)

    const diveIn = () => {
        nodes.text.setAttribute('contenteditable', false)
        unsubscribe()
        withAnimation('bubbleintoheader', nodes, () => {
            nodes.point.style = ''
            nodes.point.classList.add('bubbleheader')
        })
        diveInto()
    }

    const diveOut = () => {
        subscribe()
        moveAndScale(bubblee, nodes)
        nodes.point.classList.remove('bubbleheader')
        withAnimation('bubbleoutofheader', nodes)
    }

    const listeners = {
        input: (event) => {
            bubblee.text = nodes.text.textContent
            saveMe(bubblee)
        },
        contextmenu: (event) => {
            event.preventDefault()
            return false
        },
        mouseleave: (event) => {
            nodes.text.setAttribute('contenteditable', false)
        },
        wheel: (event) => {
            bubblee.scale = bubblee.scale - 0.05 * Math.sign(event.deltaY)
            moveAndScale(bubblee, nodes)
            saveMe(bubblee)
            event.stopPropagation()
        },
        mousedown: bubblePress(bubblee, nodes, {
            move: () => saveMe(bubblee),
            remove: () => {
                unsubscribe()
                removeMe(bubblee)
            },
            space: diveIn
        })
    }
    
    const subscribe = () => {
        if(subscribed)
        {
            return
        }
        subscribed = true
        nodes.text.addEventListener('input', listeners.input)
        nodes.bubble.addEventListener('contextmenu', listeners.contextmenu)
        nodes.text.addEventListener('contextmenu', listeners.contextmenu)
        nodes.point.addEventListener('mouseleave', listeners.mouseleave)
        nodes.bubble.addEventListener('wheel', listeners.wheel)
        nodes.text.addEventListener('wheel', listeners.wheel)
        nodes.bubble.addEventListener('mousedown', listeners.mousedown)
        nodes.text.addEventListener('mousedown', listeners.mousedown)
    }

    const unsubscribe = () => {
        if(!subscribed)
        {
            return
        }
        subscribed = false
        nodes.text.removeEventListener('input', listeners.input)
        nodes.bubble.removeEventListener('contextmenu', listeners.contextmenu)
        nodes.text.removeEventListener('contextmenu', listeners.contextmenu)
        nodes.point.removeEventListener('mouseleave', listeners.mouseleave)
        nodes.bubble.removeEventListener('wheel', listeners.wheel)
        nodes.text.removeEventListener('wheel', listeners.wheel)
        nodes.bubble.removeEventListener('mousedown', listeners.mousedown)
        nodes.text.removeEventListener('mousedown', listeners.mousedown)
    }
    
    return {
        subscribe: subscribe,
        unsubscribe: unsubscribe,
        node: nodes.point,
        show: (node) => {
            node.appendChild(nodes.point)
            bubbleup(nodes, subscribe)
        },
        hide: () => {
            unsubscribe()
            bubbledown(nodes, () => nodes.point.remove())
        },
        data: bubblee,
        remove: () => {
            unsubscribe()
            removeMe(bubblee)
            bubbledown(nodes)
        },
        save: () => saveMe(bubblee),
        diveIn: diveIn,
        diveOut: diveOut,
        move: (x, y) => {
            Object.assign(bubblee, {x, y})
            moveAndScale(bubblee, nodes)
        }
    }
}

function moveAndScale(bubble, nodes)
{
    nodes.point.style = ('transform: translate(' + bubble.x + 'px, ' + bubble.y + 'px);' +
                         ' --bubble-scale: ' + bubble.scale + ';')
}

function createBubbleNode(bubble)
{
    const node = document.createElement('div')
    node.classList.add('bubble')
    node.style['background-color'] = bubble.color
    node.style['box-shadow'] = '0 0 6px ' + bubble.color
    node.setAttribute('draggable', false)

    return node
}

function createPoint(bubble)
{
    const node = document.createElement('div')
    node.classList.add('bubble-point')

    return node
}

function createText(bubble)
{
    const node = document.createElement('div')
    node.classList.add('bubble-text')
    node.setAttribute('contenteditable', false)
    node.setAttribute('spellcheck', false)
    node.setAttribute('draggable', false)
    node.textContent = bubble.text

    return node
}

const bubbleWithAnimation = (className) => (nodes, cc) => {
    nodes.point.classList.add(className)

    const f = () => {
        nodes.point.classList.remove(className)
        nodes.bubble.removeEventListener('animationend', f)
        cc && cc()
    }

    nodes.bubble.addEventListener('animationend', f)
}

export const withAnimation = (className, nodes, cc) => bubbleWithAnimation(className)(nodes, cc)

const bubbleup = bubbleWithAnimation('bubbleup')
const bubbledown = bubbleWithAnimation('bubbledown')
const bubblePress = (bubble, nodes, on) => (event) => {
    if(event.button === 2)
    {
        nodes.text.setAttribute('contenteditable', true)
        // bubble.focus()
        document.getSelection().setPosition(nodes.text.childNodes[0], nodes.text.textContent.length)
        
        return;
    }
    on.start && on.start()
    const start = {x: bubble.x - event.clientX, y: bubble.y - event.clientY}
    nodes.point.classList.add('floating')
    const onmousemove = (event) => {
        bubble.x = event.clientX + start.x
        bubble.y = event.clientY + start.y
        moveAndScale(bubble, nodes)
        on.move && on.move()
    }
    const maybeRemove = (event) => {
        if(event.key === 'Backspace')
        {
            onleave()
            on.remove && on.remove()
            bubbledown(nodes, () => nodes.point.remove())
            //removeMe()
        }
        if(event.key === ' ')
        {
            on.space && on.space()
            onleave()
            //diveInto()
        }
    }
    const onleave = () => {
        nodes.point.classList.remove('floating')
        window.removeEventListener('mousemove', onmousemove)
        window.removeEventListener('mouseup', onleave)
        window.removeEventListener('mouseleave', onmousemove)
        window.removeEventListener('keydown', maybeRemove)
        const parent = nodes.point.parentNode
        nodes.point.remove()
        parent.appendChild(nodes.point)
    }
    window.addEventListener('mousemove', onmousemove)
    window.addEventListener('mouseup', onleave)
    window.addEventListener('keydown', maybeRemove)
}
