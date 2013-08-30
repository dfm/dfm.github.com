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

## Building a user-repository social graph

## Repository recommendations

## Comments

* github-username - 2013-08-30 - Copy this line and make your comment...
