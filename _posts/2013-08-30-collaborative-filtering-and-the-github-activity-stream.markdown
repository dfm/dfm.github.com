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
Either way, here's a fairly robust function that takes in a single event
object and returns the user and repository involved:

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

So we now have functions to download event data and parse the events.
Let's put this all together.
In this section, we're going to download a bunch of events and save all of the
interactions as a graph.

> **Redis as a graph database:**
> My friend [Micha](http://micha.gd) swears by [Redis](http://redis.io) for
> just about any problem and he first introduced me to the idea of using it as
> a graph database.
> Redis is an in-memory key-value store that is ridiculously fast.
> The main reason why I use Redis so often is that the "value" part of the
> whole key-value thing can have all sorts of awesome data structures.
> In particular, Redis ships with a [sorted set data
> type](http://redis.io/commands#sorted_set) that is perfect for
> implementing a graph database.
> The nodes in the graph are represented by keys in the data store and then
> edges are implemented as sorted sets where the score indicates the
> strength of the edge.
> Note that this makes it easy to build both directed or undirected graphs.
> In this framework, it's easy to query the database for the top _N_ most
> (or least) connected neighbors—using the
> [ZREVRANGE](http://redis.io/commands/zrevrange) command—which is the main
> type of query that we'll need for now.

For our social graph of GitHub activity, we'll have nodes representing users
designated by keys of the form `ghsg:user:{username}` and nodes representing
repositories with keys of the form `ghsg:repo:{owner}/{repository}`.
User nodes will be connected to repository nodes and vice versa with edge
weights given by the total number of interactions between the user and the
repository.
It would be possible (and possibly very interesting) to implement a better
weight model that takes into account different types of events and decays with
time (à la [Forget-Table](https://github.com/mynameisfiber/forgettable)) but
I wanted to keep things simple for this example.

To run this next script, you'll need a `redis-server` listening to the
default port on `localhost` and the
[redis-py](https://github.com/andymccurdy/redis-py) Python bindings to the
Redis API.

{% highlight python %}
import redis

# Connect to the Redis server.
rdb = redis.Redis()

# Get a Redis pipeline.
pipe = rdb.pipeline()

# Loop forever.
while True:
    # Download some events and loop over them.
    for event in get_random_events():
        # Parse the event and skip it if it doesn't include an interaction.
        actor, reponame = parse_event(event)
        if actor is None or reponame is None:
            continue

        # Update the graph weights.
        pipe.zincrby("ghsg:user:{0}".format(actor), reponame, 1)
        pipe.zincrby("ghsg:repo:{0}".format(reponame), actor, 1)
        pipe.execute()
{% endhighlight %}

All you need to do now is save this script (and the above functions) to a file
(or just download a working version from [this
gist](https://gist.github.com/dfm/6468317)) and run it for a few hours to
gather some data to work with.
You might want to use the code from [the
gist](https://gist.github.com/dfm/6468317) because it runs several threads in
parallel.
If you decide to implement your own parallel version, make sure that you're
careful with your random number generators.

## Repository recommendations

## Comments

* github-username - 2013-08-30 - Copy this line and make your comment...
