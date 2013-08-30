var github_url = "https://github.com/dfm/dfm.github.com/edit/master/_posts/";

$(function() {
    var obj = $("#comments").next();
    var ul = $("<ul>");
    var ncomments = 0;
    var items = obj.find("li").each(function(i, obj) {
        var groups = /(.*?) \- (.*?) \- (.*)/i.exec($(obj).html());
        if (typeof groups == "undefined" || groups == null) return;
        if ($.trim(groups[1]) != "github-username") {
            var s = "<span class=\"comment-date\">"+groups[2]+"</span> ";
            s += "<span class=\"comment-body\"><a href=\"https://github.com/"+groups[1]+"\">"+groups[1]+"</a> said:";
            s += "<p class=\"comment\">"+groups[3]+"</p></span>";
            ul.append($("<li>").html(s));
            ncomments += 1;
        }
    });
    obj.remove();
    $("#comments").remove();
    if (ncomments > 0) {
        $("#comment-placeholder").append(ul);
    } else {
        $("#comments-section .section-title").hide();
    }

    $("#comment-btn").click(function () {
        var data = $(this).data();
        var path = data.title.split("/");
        var url = github_url + data.date + "-" + path[path.length-1] + ".markdown";
        window.location = url;
        return false;
    });
});

