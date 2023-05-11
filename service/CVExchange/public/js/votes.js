for(const btn of document.querySelectorAll('.upvote')) {
    btn.addEventListener('click', async(event) => {
        event.currentTarget.classList.toggle('on')
        const postId = btn.getAttribute('data-postid')
        await fetch('/votes/ratepost', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                postId: postId,
                rating: 1,
                page: '/'
            })
        })
        location.reload()
    })
}
for(const btn of document.querySelectorAll('.downvote')) {
    btn.addEventListener('click', async(event) => {
        event.currentTarget.classList.toggle('on')
        const postId = btn.getAttribute('data-postid')
        await fetch('/votes/ratepost', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                postId: postId,
                rating: -1,
                page: '/'
            })
        })
        location.reload()
    })
}