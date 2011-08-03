months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
if comments?
    document.write('<ul id="comments">')
    for comment in comments
        if comment['github_user'] != 'template'
            document.write('<li class="comment">')

            # write date
            date = comment['date']
            document.write('<span class="date">'+months[date.getMonth()-1]+" ")
            document.write(date.getDate()+", "+date.getFullYear()+"</span>")

            # user
            user = comment['github_user']
            document.write(' - <a href="https://github.com/'+user+'">'+user+'</a>')

            # comment
            document.write('<span class="comment_container">'+comment['comment']+'</span>')

            document.write('</li>')
    document.write('</ul>')

$(document).ready(() -> $("#comment_warning").hide())
window.post_a_comment = () ->
    $("#post_a_comment").hide()
    $("#comment_warning").show()
