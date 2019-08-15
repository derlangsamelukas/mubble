import * as storageProvider from './storage.js'
import * as bubbler from './bubble.js'

export default function go(world){
    const storage = storageProvider.local
    return gogo(world, storage.load, storage.store)
}

const nextId = (() => {
    let next = 0
    return () => {
        return next++
    }
})

const createAttachDetach = (eventName) => (node, f) => {
    let attached = false
    return {
        attach: () => {
            attached === false && node.addEventListener(eventName, f)
            attached = true
        },
        detach: () => {
            attached === true && node.removeEventListener(eventName, f)
            attached = false
        }
    }
}

function gogo(world, load, store){
    const mouse = {x: 100, y: 100}
    let zoomLevel = 1
    const point = {x: 0, y: 0}
    const colors = '#ae3030 #4fba4f #712873 #edb44c violet pink cadetblue lightgreen lightcoral coral'.split(' ')
    const texts = 'Horray,Yo,Ayayay,¿Qué tal?,Ouch,hej då,Well Well...,Hi there,Whoop,Lalalalala'.split(',')
    let bubbles = []
    const zoomable = document.createElement('div')
    zoomable.classList.add('zoomable')
    world.appendChild(zoomable)

    const wrappedListeners = 'mousedown mouseup mousemove keydown input contextmenu mouseleave wheel'.split(' ').reduce((o, k) => (o[k] = createAttachDetach(k)) && o, {})
    'mousedown mouseup mousemove'.split(' ').forEach((k) => {
        const oldCreator = wrappedListeners[k]
        wrappedListeners[k] = (node, f) => oldCreator(node, (e) => f({target: e.target, button: e.button, x: e.clientX / zoomLevel, y: e.clientY / zoomLevel}))
    })
    addTouchListeners(wrappedListeners, () => zoomLevel)
    addWheelForTouches(wrappedListeners)
    const saveBubbles = ((now = false) => {
        let timeout = null
        return () => {
            if(timeout !== null)
            {
                window.clearTimeout(timeout)
            }
            const map = (bubble) => ({
                x: bubble.data.x,
                y: bubble.data.y,
                text: bubble.data.text,
                color: bubble.data.color,
                scale: bubble.data.scale,
                children: bubble.data.children || []
            })
            const cc = () => store(bubbles.map(map)) && (timeout === null)
            if(now)
            {
                cc()
            }
            else
            {
                timeout = window.setTimeout(cc, 500)
            }
        }
    })()

    const associate = (id, index) => {
        const copy = Object.assign({}, bubbles[index])
        copy.id = id
        bubbles[index] = copy
    }

    const createSave = (id) => (bubble) => {
        const foundOnes = bubbles.filter((a) => a.id === id)
        Object.assign(foundOnes[0], bubble)
        saveBubbles()
    }

    const createRemove = (id) => () => {
        const foundOnes = bubbles.filter((a) => a.id === id)
        bubbles.splice(bubbles.indexOf(foundOnes[0]), 1)
        saveBubbles()
    }

    const createDiveInto = (id) => () => {
        const foundOnes = bubbles.filter((a) => a.id === id)
        unsubscribe()
        bubbles.forEach((bubble) => {
            bubble !== foundOnes[0] && bubble.hide()
        })
        const unsubscribeChild = gogo(world, () => {
            return Promise.resolve(foundOnes[0].data.children || [])
        }, (bubbles) => {
            foundOnes[0].data.children = bubbles
            return saveBubbles(true)
        })

        const onTitleClick = () => {
            const childBubbles = unsubscribeChild()
            subscribe()
            childBubbles.forEach((bubble) => bubble.hide())
            bubbles.forEach((bubble) => bubble !== foundOnes[0] && bubble.show(zoomable))
            foundOnes[0].diveOut()
            foundOnes[0].node.removeEventListener('click', onTitleClick)
        }
        foundOnes[0].node.addEventListener('click', onTitleClick)
    }

    const onmousemove = (event) => {
        mouse.x = event.clientX / zoomLevel
        mouse.y = event.clientY / zoomLevel
    }

    const onkeydown = (event) => {
        if(event.target && (event.target.classList.contains('bubble') || (event.target.parentNode && event.target.parentNode.classList.contains('bubble'))))
        {
            const bubble = event.target.classList.contains('bubble-text') ?
                event.target :
                (event.target.parentNode && event.target.parentNode.classList.contains('bubble-text') ? event.target.parentNode
                 : null)
            if(event.key === 'Enter')
            {
                bubble.setAttribute('contenteditable', false)
                event.preventDefault()
                return false
            }
            return true;
        }
        if(event.key === '+')
        {
            addBubble()
        }

        return true;
    }

    const addBubble = () => {
        const bubbleData = {
            x: mouse.x - point.x,
            y: mouse.y - point.y,
            text: texts[Math.floor(Math.random() * 10)],
            color: colors[Math.floor(Math.random() * 10)], scale: 0
        }
        const index = bubbles.length
        const id = nextId()
        bubbles.push(bubbler.create(bubbleData, wrappedListeners, createSave(id), createRemove(id), createDiveInto(id)))
        associate(id, index)
        bubbles[index].save()
        bubbles[index].show(zoomable)
    }

    const onwheel = (event) => {
        const splitted = String(Math.max(0.1, zoomLevel - 0.05 * Math.sign(event.deltaY))).split('.')
        zoomLevel = parseFloat(splitted.length > 1 ? splitted[0] + '.' + splitted[1].substr(0, 10) : splitted.join('.'))
        world.style = '--scale: ' + zoomLevel + '; --x: ' + point.x + 'px; --y: ' + point.y + 'px;'
    }

    let recentlyMoved = false
    const stoppedMoving = delayEvent(() => (recentlyMoved = false))
    const mousedownListener = wrappedListeners.mousedown(world, (e) => {
        if(e.target !== world)
        {
            return;
        }
        world.classList.add('floating-world')
        const start = {x: point.x - e.x, y: point.y - e.y}
        const listeners = [
            wrappedListeners.mousemove(world, (event) => {
                point.x = event.x + start.x
                point.y = event.y + start.y
                world.style = '--scale: ' + zoomLevel + '; --x: ' + point.x + 'px; --y: ' + point.y + 'px;';
                //zoomable.style.transform = 'scale(var(--scale)) translate(' + point.x + 'px, ' + point.y + 'px)'
                recentlyMoved = true
            }),
            wrappedListeners.mouseup(world, () => {
                world.classList.remove('floating-world')
                listeners.forEach((listener) => listener.detach())
                stoppedMoving()
            }),
        ]
        listeners.forEach((listener) => listener.attach())
    })

    const wheelListener = wrappedListeners.wheel(world, onwheel)

    const onmouseclick = (e) => {console.log(recentlyMoved) || !recentlyMoved && e.target === world && addBubble()}

    const subscribe = () => {
        world.addEventListener('mousemove', onmousemove)
        wheelListener.attach()
        world.addEventListener('click', onmouseclick)
        mousedownListener.attach()
        document.addEventListener('keydown', onkeydown)
    }

    const unsubscribe = () => {
        world.removeEventListener('mousemove', onmousemove)
        wheelListener.detach()
        world.removeEventListener('click', onmouseclick)
        mousedownListener.detach()
        document.removeEventListener('keydown', onkeydown)
    }

    const displayBubbles = (loadedBubbles) => {
        bubbles = loadedBubbles.map(() => null)
        loadedBubbles.forEach((bubbleData, index) => {
            const id = nextId()
            const bubble = bubbler.create(bubbleData, wrappedListeners, createSave(id), createRemove(id), createDiveInto(id))
            bubbles[index] = bubble
            associate(id, index)
            bubble.show(zoomable)
        })
    }


    subscribe()
    load().then((loadedBubbles) => displayBubbles(loadedBubbles))

    return () => unsubscribe() || bubbles
}

window.onerror = (e) => alert(e.toString())
const addTouchListeners = (wrappedListeners, getZoom) => {
    const addThese = [
        ['mousedown', 'touchstart'],
        ['mousemove', 'touchmove'],
        ['mouseup', 'touchend'],
    ]
    const mousedown = wrappedListeners.mousedown
    const mousemove = wrappedListeners.mousemove
    const mouseup = wrappedListeners.mouseup
    let last = new Date().getTime()

    addThese.forEach((these) => {
        const mouseListener = wrappedListeners[these[0]]
        const touchListener = createAttachDetach(these[1])
        wrappedListeners[these[0]] = (node, f) => {
            const mouse = mouseListener(node, f)
            const touch = touchListener(node, (e) => {
                const newTime = new Date().getTime()
                e.touches.length < 2 && f({
                    button: newTime - last < 300 ? 2 : 1,
                    target: e.target,
                    x: !e.touches[0] ? void 0 : e.touches[0].screenX / getZoom(),
                    y: !e.touches[0] ? void 0 : e.touches[0].screenY / getZoom()
                })
                last = newTime
            })
            return {
                attach: () => {
                    mouse.attach()
                    touch.attach()
                },
                detach: () => {
                    mouse.detach()
                    touch.detach()
                }
            }
        }
    })
}

const addWheelForTouches = (wrappedListeners) => {
    const mouseListener = wrappedListeners.wheel
    const startListener = createAttachDetach('touchstart')
    const moveListener = createAttachDetach('touchmove')
    const endListener = createAttachDetach('touchend')
    wrappedListeners.wheel = (node, f) => {
        const mouse = mouseListener(node, f)
        const start = startListener(node, (e) => {
            if(e.touches.length !== 2)
            {
                return
            }

            let diff = Math.abs(e.touches[0].screenX - e.touches[1].screenX) * Math.abs(e.touches[0].screenY - e.touches[1].screenY)
            const move = moveListener(node, (e) => {
                if(e.touches.length !== 2){return}
                const newDiff = Math.abs(e.touches[0].screenX - e.touches[1].screenX) * Math.abs(e.touches[0].screenY - e.touches[1].screenY)
                f({
                    target: e.target,
                    deltaY: (diff - newDiff) / 10,
                    stopPropagation: () => e.stopPropagation()
                })
                diff = newDiff
            })
            const end = endListener(node, () => {
                move.detach()
                end.detach()
            })
            move.attach()
            end.attach()
        })
        return {
            attach: () => {
                mouse.attach()
                start.attach()
            },
            detach: () => {
                mouse.detach()
                start.detach()
            }
        }
    }
}

const delayEvent = (g) => {
    let f = new Function()
    return () => {
        f()
        const handle = window.setTimeout(() => {
            g()
            f = new Function()
        }, 500)
        f = () => window.clearTimeout(handle)
    }
}
