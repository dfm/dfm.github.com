Title: Python modules in C
Date: 2012-08-03 0:00
Category: Tutorial
Slug: python-c-extensions
Summary: How to roll your own Python modules in C.

Writing your own C extensions to Python can seem like a pretty daunting task
when you first get started. If you take a look at the [Python/C API
docs][capi] the details of reference counting and compilation are enough to
make you go crazy. This is the main reason why [so][cython] [many][swig]
[options][ctypes] exist for wrapping or compiling C code into Python without
ever directly interacting with the API. That being said, I often find that
all that I need to do is wrap a _single_ C function that accepts a few
doubles and returns another double. In this case, it seems crazy to generate
the thousands of lines of C code required by automatic methods like Cython
and SWIG. You might argue that these aesthetic issues don't provide
sufficient reason for diving into the rabbit hole that the C API seems to
be—and maybe you'd be right—but I'm a stubborn coder and I don't mind
getting my hands a little dirty so I went for it. This was a few years ago
and since then, I've developed a template module that suits my needs
perfectly and it seems to make the extension writing process relatively
painless so I thought that I'd share what I've learned here.

I'm not going to claim that what I say here is a general introduction to
writing C extensions because I don't feel qualified to do that but it
should be a sufficient tutorial for a scientific programmer (read: grad
student) to get started and write a fully functional module for their
research. In particular, this tutorial will be most useful for someone
who already has a chunk of code written in C and just wants to be able to
call a few of those functions directly from within Python. Several people
have specifically asked me about how to do this when they have legacy
data analysis code that they would like to use with my Markov chain
Monte Carlo package [emcee](http://danfm.ca/emcee). In that context,
the C code is expected to return the likelihood of some data given some
model parameters passed as doubles to the C function. This is the same
format that would be needed if you just wanted to find the minimum
chi-squared (or maximum likelihood) solution to a problem using something
like
[scipy.optimize](http://docs.scipy.org/doc/scipy/reference/optimize.html).

<hr>

The Objective
-------------

To be concrete, let's consider a specific example: fitting a line
(parameterized by a slope _m_ and y intercept _b_) to some _N_ noisy data
points \\( \\{ x\_n, y\_n, \sigma\_n \\} \\). In this case, the
chi-squared function is given by:

<p>
\(
    \displaystyle{\chi^2 (m, b) = \sum_{n = 1} ^N \frac{[y_n -
        (m \, x_n + b)]^2}{\sigma_n^2}} \quad .
\)
</p>

It's probably overkill to write this function in C but it'll do for our
purposes today. In C, the file `chi2.c` containing our function should look
something like:

```

#include "chi2.h"

double chi2(double m, double b, double *x, double *y, double *yerr, int N) {
    int n;
    double result = 0.0, diff;

    for (n = 0; n < N; n++) {
        diff = (y[n] - (m * x[n] + b)) / yerr[n];
        result += diff * diff;
    }

    return result;
}

```

And the corresponding header file `chi2.h` is simply:

```
double chi2(double m, double b, double *x, double *y, double *yerr, int N);
```

Now, our goal is to wrap this function so that we can call it from directly
within Python.

<hr>

The Wrapper
-----------

The code needed to write the wrapper module is another C file containing
a few special Python functions. Conventionally, the names of C extensions
begin with an underscore so let's call our module `_chi2` and write it in
a file `_chi2.c` (not to be confused with the `chi2.c` file that we wrote
just a minute ago).

In order to be able to access the C functions and types in the Python API,
the first thing that we need to do is import the Python header. I also
expect that we'll want to interact with `numpy` arrays and our `chi2`
function as well so let's import those headers too:

```
#include <Python.h>
#include <numpy/arrayobject.h>
#include "chi2.h"
```

Next, we should write the
[docstrings](http://www.python.org/dev/peps/pep-0257/) for our module and
the function that we're wrapping:

```
static char module_docstring[] =
    "This module provides an interface for calculating chi-squared using C.";
static char chi2_docstring[] =
    "Calculate the chi-squared of some data given a model.";
```

and declare the function:

```
static PyObject *chi2_chi2(PyObject *self, PyObject *args);
```

This is the first time that we're seeing anything Python-specific. The
type `PyObject` refers to all Python types. Any communication between the
Python interpreter and your C code will be done by passing `PyObject`s so
any function that you want to be able to call from Python must return one.
Under the hood, `PyObject` is just a `struct` with a reference count and a
pointer to the data contained within the object. This can be as simple as
a `double` or `int` or as complicated as a fully functional Python class.
Remember: [everything is an object](http://www.diveintopython.net/getting_to_know_python/everything_is_an_object.html).

The name that I've given to the function (`chi2_chi2`) is also a matter of
convention. From Python, we're going to call the function with the command
`_chi2.chi2` where `_chi2` is the name of the module and `chi2` is the name
of the function. Since C doesn't have any concept of namespaces, the
convention is to name your C functions with the form
`{module_name}_{function_name}` and my preference is to leave out the
leading underscore but it doesn't really matter either way.

The arguments for the function are pretty standard fare. In our case the
`self` object points to the module and the `args` object is a Python tuple
of input arguments—we'll see how to parse them soon. It is also possible
to accept keyword arguments by including a third `PyObject` in the calling
specification but let's not get into that here.

Now, we'll specify what the members of this module will be. In this case
there is only going to be one function (called `chi2`) so the "method
definition" looks like:

```
static PyMethodDef module_methods[] = {
    {"chi2", chi2_chi2, METH_VARARGS, chi2_docstring},
    {NULL, NULL, 0, NULL}
};
```

More functions can be added by adding more lines like the second one. This
second line contains all the info that the interpreter needs to link a Python
call to the correct C function and call it in the right way. The
first string is the name of the function as it will be called from Python,
the second object is the C function to link to and the last argument is the
docstring for the function. The third argument `METH_VARARGS` means that the
function only accepts positional arguments. If you wanted to support
keyword arguments, you would need to change this to [`METH_VARARGS |
METH_KEYWORDS`](http://docs.python.org/extending/extending.html#the-module-s-method-table-and-initialization-function).

The final step in initializing your new C module is to write an `init{name}`
function. This function **must** be called `init_chi2` where `_chi2` is
(of course) the name of the module.

```
PyMODINIT_FUNC init_chi2(void)
{
    PyObject *m = Py_InitModule3("_chi2", module_methods, module_docstring);
    if (m == NULL)
        return;

    /* Load `numpy` functionality. */
    import_array();
}
```

Everything that's going on here should be fairly self explanatory by this
point but it's important to note that if you want to use any of the
functionality defined by `numpy`, you need to include the call to
`import_array()` (a function defined in the `numpy/arrayobject.h` header).

<hr>

The Interface
-------------

Up to this point, we've written only about 25 lines of C code to set up
a C extension module. All of these steps will be common between any modules
that you write but as we continue, the details become somewhat less general
because I will focus on building a wrapper for scientific code.

Now, it's time to write the `chi2_chi2` function that we declared above.
In this example, the `args` tuple will contain two `double`s (the slope
and y-intercept of our model) and three `numpy` arrays for the _x_, _y_
and uncertainties that constitute the "data" that we're trying to model.
Let's just throw down the whole function here and then dissect it line-by-line
below:

```
static PyObject *chi2_chi2(PyObject *self, PyObject *args)
{
    double m, b;
    PyObject *x_obj, *y_obj, *yerr_obj;

    /* Parse the input tuple */
    if (!PyArg_ParseTuple(args, "ddOOO", &m, &b, &x_obj, &y_obj,
                                         &yerr_obj))
        return NULL;

    /* Interpret the input objects as numpy arrays. */
    PyObject *x_array = PyArray_FROM_OTF(x_obj, NPY_DOUBLE, NPY_IN_ARRAY);
    PyObject *y_array = PyArray_FROM_OTF(y_obj, NPY_DOUBLE, NPY_IN_ARRAY);
    PyObject *yerr_array = PyArray_FROM_OTF(yerr_obj, NPY_DOUBLE,
                                            NPY_IN_ARRAY);

    /* If that didn't work, throw an exception. */
    if (x_array == NULL || y_array == NULL || yerr_array == NULL) {
        Py_XDECREF(x_array);
        Py_XDECREF(y_array);
        Py_XDECREF(yerr_array);
        return NULL;
    }

    /* How many data points are there? */
    int N = (int)PyArray_DIM(x_array, 0);

    /* Get pointers to the data as C-types. */
    double *x    = (double*)PyArray_DATA(x_array);
    double *y    = (double*)PyArray_DATA(y_array);
    double *yerr = (double*)PyArray_DATA(yerr_array);

    /* Call the external C function to compute the chi-squared. */
    double value = chi2(m, b, x, y, yerr, N);

    /* Clean up. */
    Py_DECREF(x_array);
    Py_DECREF(y_array);
    Py_DECREF(yerr_array);

    if (value < 0.0) {
        PyErr_SetString(PyExc_RuntimeError,
                    "Chi-squared returned an impossible value.");
        return NULL;
    }

    /* Build the output tuple */
    PyObject *ret = Py_BuildValue("d", value);
    return ret;
}
```

I know that that was a lot in one go so let's break things down a little bit.
The first thing that we did was parse the input tuple using the
`PyArg_ParseTuple` function. This function takes the tuple, a format and
the list of pointers to the objects that you want to take the input values.
This format should be familiar if you've ever used something like the
`sscanf` function in C but the format characters are [a little
different](http://docs.python.org/c-api/arg.html). In our example, `d`
indicates that the argument should be cast as a C `double` and `O` is
just a catchall for `PyObject`s. There isn't a specific format character
for `numpy` arrays so we have to parse them as raw `PyObject`s and then
interpret them afterwards. If `PyArg_ParseTuple` fails, it will return
`NULL` which is the C-API technique for propagating exceptions. That means
that we should also return `NULL` immediately if parsing the tuple fails.

The next few lines (12-25) show how to load `numpy` arrays from the raw
objects. The
[`PyArray_FROM_OTF`](http://docs.scipy.org/doc/numpy/user/c-info.how-to-extend.html#PyArray_FROM_OTF)
function is a fairly general method for converting an arbitrary Python
object into a well-behaved `numpy` array that can be used in a standard
C function. It is important to note that this creation mechanism only
returns a copy of the object if necessary. Instead, the function normally
only returns a pointer to the input object if it was already a `numpy`
array satisfying various requirements that we won't discuss in detail here.
The flags `NPY_DOUBLE` and `NPY_IN_ARRAY` ensure that the returned array
object will be represented as contiguous arrays of C `double`s. There are
some other options available for different types, orderings and permissions
but most of the time, this is probably what you'll need and the other
options are described in [the
documentation](http://docs.scipy.org/doc/numpy/user/c-info.how-to-extend.html#PyArray_FROM_OTF).

> **Reference Counting**: Memory management in Python works by keeping
> track of the number of "references" to a particular object and then
> deallocating the memory of that object when that count reaches zero.
> You can read more about the details of this system
> [elsewhere](http://docs.python.org/extending/extending.html#reference-counts)
> but for now, you need to keep in mind that when you return a `PyObject`
> from a function you might want to run `Py_INCREF` on it to
> increment the reference count and when you create a new object within
> you function that you don't want to return, you should run `Py_DECREF` on
> it before the function returns (even if the execution failed) so that you
> don't end up with a memory leak. The [documentation explaining this
> system](http://docs.python.org/extending/extending.html#ownership-rules)
> makes the important comment that it is part of each function's "interface
> specification" whether or not it increases the reference count of an
> object before it returns or not. With this in mind, you need to keep
> careful track of which functions do what or the memory usage can become
> a little ugly.

In our example, the objects returned by `PyArg_ParseTuple` do not have
their reference count incremented (the calling function still "owns" them)
so you don't need to decrement the reference count of the `*_obj` objects
before returning. Conversely, `PyArray_FROM_OTF` does return an object with
a +1 reference count. This means that you **must** call `Py_DECREF` with
the `*_array` objects as the first argument before returning from this
function. If `PyArray_FROM_OTF` can't coerce the input object into a
form digestible as a `numpy` array, it will return `NULL` so that's why
on lines 19-21, I actually use `Py_XDECREF`. `Py_XDECREF` checks
to make sure that the object isn't a `NULL` pointer before trying to
decrease the reference count whereas `Py_DECREF`
will explode if you try to call it on `NULL`.

If we successfully reach line 25 then all of the input arguments were
as expected and we have the input `numpy` arrays arranged the way we want
them to be. Now we can get on to the fun stuff. For simplicity,
on line 26, I'm assuming that we received a 1D array (but I could check this
using the [`PyArray_NDIM`](http://docs.scipy.org/doc/numpy/reference/c-api.array.html#PyArray_NDIM)
function) and getting the length of the array. Then, I'm getting pointers
to the actual C array (which will be formatted properly as an array of
`double`s because of the flags that we used in `PyArray_FROM_OTF` above).
Then, on line 34, we can finally call the C function that we wanted to wrap
in the first place.

The conditional on line 41 in the example is probably unnecessary because
the `chi2` function (by definition) will always return a non-negative value
but I wanted to include it anyways because it demonstrates how you would
throw an exception if something went wrong in the execution of the C code.
The Python interpreter has a global variable that contains a pointer to the
most recent exception that has been thrown. Then if a function returns `NULL`
it starts an upwards cascade where each function either catches the exception
using a `try-except` statement or also returns `NULL`. When the interpreter
receives a `NULL` return value, it stops execution of the current code and
shows a representation of the value of the global `Exception` variable and
the traceback. On line 42, if `chi2` returned a number less than zero,
the global `Exception` is being set to have the type `RuntimeError` and
the description: "Chi-squared returned an impossible value." Then, by
returning `NULL` we're indicating that something went wrong.

Finally, if `value` was non-negative (it'd better be), we can use
[`Py_BuildValue`](http://docs.python.org/c-api/arg.html#Py_BuildValue) to
create the output tuple. If `Py_ParseTuple` has a syntax similar to
`sscanf` then `Py_BuildValue` is the analog of `sprintf` with the same
format characters as `Py_ParseTuple`. Here, we don't need to `Py_INCREF`
the return object because `Py_BuildValue` does that for us but if you
generated the output in a different way, you might have to.

That's it for the code required for our module. It might seem like a lot of
work but you'll notice that we've only written about 120 lines of code and
the vast majority of these lines will be exactly the same in every module
that you need to write.

<hr>

Building
--------

The last thing that we need to talk about is how you might compile and
link this module so that it can actually be called from Python. The best
way to do this is to use the built-in Python [distribution
utilities](http://docs.python.org/distutils/index.html). Traditionally,
the build script is called `setup.py` and for our example, the file
is actually extremely simple:

```
from distutils.core import setup, Extension
import numpy.distutils.misc_util

setup(
    ext_modules=[Extension("_chi2", ["_chi2.c", "chi2.c"])],
    include_dirs=numpy.distutils.misc_util.get_numpy_include_dirs(),
)
```

and you can call it using the command:

```
python setup.py build_ext --inplace
```

which will compile and link you source code and create a shared object
called `_chi2.so` in the same directory. Then, from Python, you can do
the following:

```
>>> import _chi2
>>> print _chi2.chi2(2.0, 1.0, [-1.0, 4.2, 30.6],
...                            [-1.5, 8.0, 63.0],
...                            [1.0, 1.5, 0.6])
2.89888888889
```

<hr>

Summary
-------

Hopefully, after going through this tutorial, you should be able to write
your own C-extension module especially if it is just a single C function
that you want to wrap. In general, I find that most of my time is spent
copy-and-pasting when I'm writing a C extension and once you get the hang
of it it shouldn't take too much effort to incorporate code like this into
projects that you're working on. Since so much of this structure is the same
across projects, it would be awesome if someone wanted to make an interactive
tool for auto-generating skeleton code but I haven't seen anything like this
yet.

To see all the source code for this tutorial in one place, you can
check out [the gist](https://gist.github.com/3247796) or clone the
repository using `git`:

```
git clone git://gist.github.com/3247796.git c_ext
cd c_ext
python setup.py build_ext --inplace
```

If you have any comments, suggestions or questions, [fork this
page](https://github.com/dfm/dfm.github.com/edit/master/_posts/2012-08-01-python-c-extensions.markdown)
or [tweet at me](https://twitter.com/__dfm__).


[capi]: http://docs.python.org/c-api/
[cython]: http://www.cython.org/
[swig]: http://www.swig.org/
[ctypes]: http://docs.python.org/library/ctypes.html
