## Dev bar for gnome. 

Gnome version of the DevBar originally made for mac https://github.com/boxed/DevBar

#### Install
First run:

    sudo dnf install gnome-tweak-tool

If necessary:

    mkdir ~/.local/share/gnome-shell/extensions

Then:

    cp -ar devbar@trioptima ~/.local/share/gnome-shell/extensions

or (repo directory)

    ln -s devbar@trioptima ~/.local/share/gnome-shell/extensions/devbar@trioptima

Then logout and log back in again.

Should show up in tweaks application, make sure to enable it there.

#### Setup
Click on preferences to setup which Url and refresh intervals.

Currently very important to send a correct url. Might crash otherwise.
