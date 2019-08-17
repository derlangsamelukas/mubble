
function post(url, data)
{
	return new Promise(function(resolve, reject){
        const xhr = new XMLHttpRequest();
        xhr.onerror = function(){
            reject(xhr.statusText);
        };
        xhr.onload = function(){
            resolve(JSON.parse(xhr.responseText));
        };
        xhr.open('POST', url);
        //xhr.setRequestHeader("Content-Type", "application/json");
        xhr.send(JSON.stringify(data));
    });
}

const removeNulls = (bubbles) => bubbles.filter((bubble) => bubble !== null)

export let remote = {
    store: (bubbles) => {
        post('/store', bubbles)
        return Promise.resolve()
    },
    load: () => {
        return post('/load', {}).then(removeNulls)
    }
}

export let local = {
    store: (bubbles) => {
        window.localStorage.setItem('bubbles', JSON.stringify(bubbles))
        return Promise.resolve()
    },
    load: () => {
        return Promise.resolve(JSON.parse(window.localStorage.getItem('bubbles') || '[]'))
    }
}
