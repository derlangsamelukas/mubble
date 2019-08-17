
export function create(wellItsABubble, create, saveMe, removeMe, diveInto){
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

    const oncontextmenu = (event) => {
        event.preventDefault()
        return false
    }

    const onwheel = (event) => {
        bubblee.scale = bubblee.scale - 0.05 * Math.sign(event.deltaY)
        moveAndScale(bubblee, nodes)
        saveMe(bubblee)
        event.stopPropagation()
    }

    const onmousedown = bubblePress(bubblee, nodes, create, {
        move: () => saveMe(bubblee),
        remove: () => {
            unsubscribe()
            removeMe(bubblee)
        },
        space: diveIn
    })

    const listeners = [
        create.input(nodes.text, (event) => {
            bubblee.text = nodes.text.textContent
            saveMe(bubblee)
        }),
        create.contextmenu(nodes.bubble, oncontextmenu),
        create.contextmenu(nodes.text, oncontextmenu),
        create.mouseleave(nodes.point, (event) => {
            nodes.text.setAttribute('contenteditable', false)
        }),
        create.wheel(nodes.bubble, onwheel),
        create.wheel(nodes.text, onwheel),
        create.mousedown(nodes.bubble, onmousedown),
        create.mousedown(nodes.text, (e) => {
            if(e.button === 2)
            {
                const modal = document.createElement('div')
                const input = document.createElement('input')
                const button = document.createElement('div')
                modal.classList.add('modal')
                button.classList.add('button')
                button.textContent = 'OK'
                input.type = 'text'
                input.value = nodes.text.textContent
                modal.appendChild(input)
                modal.appendChild(button)
                document.body.appendChild(modal)
                window.requestAnimationFrame(() => input.focus())
                button.addEventListener('click', () => {
                    modal.remove()
                    nodes.text.textContent = input.value
                    bubblee.text = nodes.text.textContent
                    saveMe(bubblee)
                })
                //nodes.text.setAttribute('contenteditable', true)
                //document.getSelection().setPosition(nodes.text.childNodes[0], nodes.text.textContent.length)
            }
        }),
    ]
    
    const subscribe = () => {
        listeners.forEach((attacher) => attacher.attach())
    }

    const unsubscribe = () => {
        listeners.forEach((attacher) => attacher.detach())
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
const bubblePress = (bubble, nodes, create, on) => (event) => {
    if(event.button === 2)
    {
        on.remove && on.remove()
        bubbledown(nodes, () => nodes.point.remove())
        //nodes.text.setAttribute('contenteditable', true)
        // bubble.focus()
        //document.getSelection().setPosition(nodes.text.childNodes[0], nodes.text.textContent.length)
        
        return;
    }
    on.start && on.start()
    const start = {x: bubble.x - event.x, y: bubble.y - event.y}
    nodes.point.classList.add('floating')
    const onmousemove = (event) => {
        bubble.x = event.x + start.x
        bubble.y = event.y + start.y
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
        listeners.forEach((listener) => listener.detach())
        const parent = nodes.point.parentNode
        nodes.point.remove()
        parent.appendChild(nodes.point)
    }
    const listeners = [
        create.mousemove(window, onmousemove),
        create.mouseup(window, onleave),
        create.keydown(window, maybeRemove)
    ]
    listeners.forEach((listener) => listener.attach())
}
