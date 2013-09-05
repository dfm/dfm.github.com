---
    layout: post
    title: Collaborative filtering & the GitHub activity stream
    excerpt: "Social recommendations using the stream of public activity on
    GitHub.com"
---

I've been thinking about fun things to do with the
[GitHub](https://github.com) public activity stream for a long time.
I spend a lot of time on GitHub working on [projects related to my
PhD](https://github.com/dfm/kplr) and [building stupid
websites](https://github.com/dfm/twitterick).
All of my interactions with these projects happen in the open and they are
visible in the [public GitHub activity
stream](https://github.com/timeline.json) and archived by [the GitHub
Archive](http://www.githubarchive.org/) (all the way back to 2011-02-12).
This is clearly an incredibly rich dataset and what nerd doesn't like looking
at stats about themselves and their internet usage?
My first project with this dataset was [The Open Source Report
Card](http://osrc.dfm.io), an automatically generated [Mad
Libs](http://en.wikipedia.org/wiki/Mad_Libs)-like description of (almost) any
GitHub user's developer personality.
As part of this project, I figured out how to scrape the GitHub Archive's
un-normalized and often malformed "JSON" files.
Don't get me wrong, I'm not trying to talk smack on the archive—it provides an
invaluable and extremely robust service—but it can be a challenge to scrape at
times (as I will describe here).
I've been especially interested in using the social-network aspect of GitHub
to build some sort of recommendation system to help discover new projects or
find established projects that might be of interest.
I have recently taken a baby step towards this goal and I wanted to share some
of the things that I've learned along the way.

The end result of this post is a service that can, given a specific
repository, recommend other projects that are similar.
The recommendation doesn't take any metadata about the repository into
account.
Instead, it is based only on the list of events where users have interacted
with the repository.
In this sense, the recommendation can be considered "social".
This type of recommendation is similar to (and based on) the product
recommendations on Amazon but the objective function (or utility function) is
somewhat more nebulous (we can't measure it in dollars)… but I'll come back to
this later.
For now, I'll start by describing how I scraped the event data to build an
"approximate social graph" and then I'll explain my algorithm for recommending
similar repositories in real time.
The implementation details are all written in Python but I'm only using
general purpose packages so it shouldn't be hard to implement any part of this
in your language of choice.

## Scraping the event stream

When I started this project, I didn't want to wait for the entire activity
stream to download before starting to play so I decided to simply download a
random sampling of the events.
To do this, I wrote a Python function that uses
[requests](http://python-requests.org) to download a randomly chosen event
event archive from the GitHub archive.
The URLs for the files have the form

```
http://data.githubarchive.org/YYYY-MM-DD-H.json.gz
```

where `YYYY-MM-DD` is the ISO formatted date and `H` is a number between 0 and
23 (inclusive) indicating the hour (in PST, I think) when the data was
collected.
The archive has activity data stored since 2011-02-12.

Here's the function that I came up with to download and parse a single random
event archive from the GitHub Archive:

{% highlight python %}
import json
import gzip
import random
import requests
from StringIO import StringIO
from datetime import datetime, timedelta

# The earliest events on GitHub archive.
initial_date = datetime(year=2011, day=12, month=2)

# The amount of time since `initial_date`.
total_time = datetime.today() - initial_date

def get_random_events(tries=0):
    # Choose a random datetime between 2011-02-12 and right now.
    date = initial_date + timedelta(days=random.random() * total_time.days)

    # Construct the URL.
    url = ("http://data.githubarchive.org/" + date.strftime("%Y-%m-%d")
           + "-{0}.json.gz".format(date.hour))

    try:
        # Download the file.
        r = requests.get(url)
        assert r.status_code == requests.codes.ok

        # Try to parse the events.
        events = [json.loads(line.decode("utf-8", errors="ignore"))
                  for line in gzip.GzipFile(fileobj=StringIO(r.content))]

    except (AssertionError, ValueError):
        if tries < 10:
            print("Retrying...")
            return get_random_events(tries=tries+1)
        raise RuntimeError("Too many retries.")

    return events
{% endhighlight %}

Most of this code should be fairly self-explanatory.
We start by downloading a random file from the GitHub Archive and then try to
parse the JSON.
It's important to note that the files do not contain one big JSON object.
Instead, each line of the file has its own (hopefully) valid object describing
a single event.
The `try`-`except` block is there to catch network failures and malformed
JSON.
There might be something better to do with bad JSON objects (besides just
skipping them) but this'll do for now.

Next, we'll extract the information that we need from each event parsed by the
above function.
The only thing that we care about for this demo is: which users interact with
which repositories.
For simplicity, we'll weight every interaction equally and simply count the
number of times a given user interacts with a given repository.
The main problem here is that the schema of the event objects is not
consistent.
For example, as far as I can tell, the information about the user who
performed the action is stored in the attribute `actor` but sometimes this is
a string (the user's GitHub username) and sometimes it's a dictionary with the
username saved as `.login`.
Either way, here's a fairly robust that takes in a single even object and
returns the user and repository involved:

{% highlight python %}
sentinel = (None, None)

def parse_event(event):
    # Parse the user involved and skip if no user was.
    actor = event.get("actor")
    if actor is None:
        return sentinel

    # Skip events that don't involve a repository.
    evttype = event.get("type")
    if evttype in (None, "GistEvent", "FollowEvent", "MemberEvent",
                    "TeamAddEvent"):
        return sentinel

    # Deal with inconsistencies in the data formats.
    try:
        actor = actor.lower()
    except AttributeError:
        actor = actor.get("login")
        if actor is None:
            return sentinel
        actor = actor.lower()

    # Determine the repository involved.
    repo = event.get("repository")
    reponame = None

    # Sometimes the repository is called "repo" instead.
    if repo is None:
        repo = event.get("repo")
        if repo is not None:
            reponame = repo.get("name")
    else:
        reponame = repo.get("owner") + "/" + repo.get("name")

    # Skip if no repository was involved.
    if reponame is None:
        return sentinel

    # Sometimes there's a bug in the data and the repository doesn't
    # have an owner. Eff that shit.
    if reponame[0] == "/":
        return sentinel

    # Normalize the repository name.
    reponame = reponame.lower()

    return actor, reponame
{% endhighlight %}

## Building a user-repository social graph

## Repository recommendations

## Comments

* github-username - 2013-08-30 - Copy this line and make your comment...
