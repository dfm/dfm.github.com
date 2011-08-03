var comment, date, months, user, _i, _len;
months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
if (typeof comments !== "undefined" && comments !== null) {
  document.write('<ul id="comments">');
  for (_i = 0, _len = comments.length; _i < _len; _i++) {
    comment = comments[_i];
    if (comment['github_user'] !== 'template') {
      document.write('<li class="comment">');
      date = comment['date'];
      document.write('<span class="date">' + months[date.getMonth() - 1] + " ");
      document.write(date.getDate() + ", " + date.getFullYear() + "</span>");
      user = comment['github_user'];
      document.write(' - <a href="https://github.com/' + user + '">' + user + '</a>');
      document.write('<span class="comment_container">' + comment['comment'] + '</span>');
      document.write('</li>');
    }
  }
  document.write('</ul>');
}
$(document).ready(function() {
  return $("#comment_warning").hide();
});
window.post_a_comment = function() {
  $("#post_a_comment").hide();
  return $("#comment_warning").show();
};