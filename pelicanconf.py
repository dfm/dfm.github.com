#!/usr/bin/env python
# -*- coding: utf-8 -*- #
from __future__ import unicode_literals

AUTHOR = u"Dan Foreman-Mackey"
SITENAME = u"Dan Foreman-Mackey"
SITEURL = "http://dan.iel.fm"
RELATIVE_URLS = True

PATH = "content"

TIMEZONE = "America/New_York"

DEFAULT_LANG = u"en"

# Feed generation is usually not desired when developing
FEED_ALL_ATOM = None
CATEGORY_FEED_ATOM = None
TRANSLATION_FEED_ATOM = None

THEME = "theme"

ARTICLE_URL = "posts/{slug}/"
ARTICLE_SAVE_AS = "posts/{slug}/index.html"
