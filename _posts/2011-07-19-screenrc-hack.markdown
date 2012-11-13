---
    layout: post
    title: The sweetest .screenrc hack ever!
    excerpt: Get the most out of your GNU screen titles.
---

_This is an old post from my other [blog](http://dtfm.tumblr.com)_.

![Screenshot](/media/2011-07-19-screenshot.png)

I've been using screen on remote machines a lot these days but I found myself
getting frustrated with the lack of useful information in the tab titles.
What I wanted was for the title to display the current working directory if
I was at the command prompt and the name of the running program if I was
running something else. As demonstrated above, I succeeded (by hacking
together a bunch of google search results)!

First you have to add this to your .screenrc:

{% highlight bash %}
shelltitle "$ |bash"
{% endhighlight %}

Where `$` is the delimiter at the end of your bash command prompt and `bash`
is the default tab title (you shouldn't actually ever see this!). Then you
add this to your `.bashrc`:

{% highlight bash %}
# command prompt... HOLY SHIT MAGIC!
case $TERM in
    screen*)
        SCREENTITLE='\[\ek\e\\\]\[\ek\W\e\\\]'
        ;;
    *)
        SCREENTITLE=''
        ;;
esac
export PS1="${SCREENTITLE}[\u@\h \W]\$ "
{% endhighlight %}

First, it checks whether or not you're in screen then it sets your command
prompt accordingly. The thing that you'll want to change is in the last line.
I like my standard command prompt to be `[\u@\h \W]\$` but you should change
this to whatever you want (but don't forget the `$` at the end!).

## Comments

* HugoBuddel - November 13, 2012 - Very nice, thanks! For some forgotten
reason I had this in my `.screenrc` that I had to remove:
{% highlight bash %}
sterm 'xterm-256color'
{% endhighlight %}

* github-username - January 1, 2012 - Your comment...

