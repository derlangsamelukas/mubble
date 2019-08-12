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

function gogo(world, load, store){
    const mouse = {x: 100, y: 100}
    let zoomLevel = 1
    const colors = '#ae3030 #4fba4f #712873 #edb44c violet pink cadetblue lightgreen lightcoral coral'.split(' ')
    const texts = 'Horray,Yo,Ayayay,¿Qué tal?,Ouch,hej då,Well Well...,Hi there,Whoop,Lalalalala'.split(',')
    let bubbles = []

    const saveBubbles = ((now = false) => {
        let timeout = null
        return () => {
            if(timeout !== null)
            {
                clearTimeout(timeout)
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
                timeout = setTimeout(cc, 500)
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
            bubbles.forEach((bubble) => bubble !== foundOnes[0] && bubble.show(world))
            foundOnes[0].diveOut()
            foundOnes[0].node.removeEventListener('click', onTitleClick)
        }
        foundOnes[0].node.addEventListener('click', onTitleClick)
    }

    const onmousemove = (event) => {
        mouse.x = event.clientX
        mouse.y = event.clientY
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
            const bubbleData = {
                x: mouse.x,
                y: mouse.y,
                text: texts[Math.floor(Math.random() * 10)],
                color: colors[Math.floor(Math.random() * 10)], scale: 0
            }
            const index = bubbles.length
            const id = nextId()
            bubbles.push(bubbler.create(bubbleData, createSave(id), createRemove(id), createDiveInto(id)))
            associate(id, index)
            bubbles[index].save()
            bubbles[index].show(world)
        }

        return true;
    }

    const onwheel = (event) => {
        zoomLevel = Math.max(0.1, zoomLevel + 0.05 * Math.sign(event.deltaY))
        world.style = '--scale: ' + zoomLevel
    }

    const subscribe = () => {
        document.addEventListener('mousemove', onmousemove)
        document.addEventListener('keydown', onkeydown)
        world.addEventListener('wheel', onwheel)
    }

    const unsubscribe = () => {
        document.removeEventListener('mousemove', onmousemove)
        document.removeEventListener('keydown', onkeydown)
        world.removeEventListener('wheel', onwheel)
    }

    const displayBubbles = (loadedBubbles) => {
        bubbles = loadedBubbles.map(() => null)
        loadedBubbles.forEach((bubbleData, index) => {
            const id = nextId()
            const bubble = bubbler.create(bubbleData, createSave(id), createRemove(id), createDiveInto(id))
            bubbles[index] = bubble
            associate(id, index)
            bubble.show(world)
        })
    }


    subscribe()
    load().then((loadedBubbles) => displayBubbles(loadedBubbles))

    return () => unsubscribe() || bubbles
}
