This folder contains sample pages which demonstrate the use of the charting library.
The following ready-to-use files are provided:

- **sample-template-basic.html**: A basic implementation with a chart and some UI controls
- **sample-template-advanced.html**: A rich implementation with most of the advanced features enabled
- **sample-template-instant-chart.html**: An implementation showcasing how to load an entire advanced chart in a single web component. 
- **sample-template-multi-charts.html**: An implementation of multiple charts each one having its own UI controls.
- **sample-template-chart-grid.html**: An implementation of multiple charts using a single set of UI controls (located in the **chart-grid** directory)

To use one of these, copy it into the root directory of the library package.

There are also three additional folders in here:

- **js**: Contains _sample-template.js_, the script file used by the above templates.
- **partials**: Contains _sample-template-advanced-context.html_, the HTML portion of the _sample-template-advanced.html_ file.  This file is useful for constructing your own application page using a bundling tool such as Webpack (see the Webpack example provided in this package).  You won't need _sample-template-advanced-context.html_ if you are creating your page from the sample pages included in the templates folder. 
- **chart-grid**: Contains sample template Chart Grid which demonstrates the use of multiple synchronized charts in the same page.