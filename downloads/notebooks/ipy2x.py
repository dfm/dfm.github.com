#!/usr/bin/env python
# -*- coding: utf-8 -*-

from __future__ import (division, print_function, absolute_import,
                        unicode_literals)

from base64 import encodestring

import matplotlib
from matplotlib._pylab_helpers import Gcf

from IPython.display import display
from IPython.core.pylabtools import print_figure
from IPython.zmq.pylab.backend_inline import flush_figures


def png2x(fig):
    """
    From http://nbviewer.ipython.org/gist/minrk/3301035

    """
    x, y = matplotlib.rcParams["figure.figsize"]
    dpi = matplotlib.rcParams["savefig.dpi"]
    x2x = int(x * dpi / 2)
    y2x = int(y * dpi / 2)
    png = print_figure(fig, "png")
    png64 = encodestring(png).decode("ascii")
    return "<img src='data:image/png;base64,{0}' width={1} height={2} />" \
           .format(png64, x2x, y2x)

ip = get_ipython()
html_formatter = ip.display_formatter.formatters["text/html"]
html_formatter.for_type(matplotlib.figure.Figure, png2x)

# HACK.
ip._post_execute.pop(flush_figures, None)
def new_flush_figures():
    try:
        for figure_manager in Gcf.get_all_fig_managers():
            display(figure_manager.canvas.figure)
    finally:
        matplotlib.pyplot.close('all')
ip.register_post_execute(new_flush_figures)
