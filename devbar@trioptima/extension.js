
'use strict';

const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const St = imports.gi.St;
const Clutter = imports.gi.Clutter;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Soup = imports.gi.Soup;
const Util = imports.misc.util;
const Lang = imports.lang;
const Mainloop = imports.mainloop;
const ByteArray = imports.byteArray;

let _httpSession;

const DevBar = new Lang.Class({
    Name: 'DevBar',	// Class Name
    Extends: PanelMenu.Button,

    _init: function () {
        this.stop = false;
        

        this.parent(1, `${Me.metadata.name} Indicator`, false);
        // Get the GSchema source so we can lookup our settings

        _httpSession = new Soup.SessionAsync();
        Soup.Session.prototype.add_feature.call(_httpSession, new Soup.ProxyResolverDefault());
        let gschema = Gio.SettingsSchemaSource.new_from_directory(
            Me.dir.get_child('schemas').get_path(),
            Gio.SettingsSchemaSource.get_default(),
            false
        );

        this.settings = new Gio.Settings({
            settings_schema: gschema.lookup('org.gnome.shell.extensions.devbar', true)
        });

        // Watch the settings for changes
        this._onUrlChangedId = this.settings.connect(
            'changed::url',
            this._onPanelStatesChanged.bind(this)
        );
        this._onIntervalChangedId = this.settings.connect(
            'changed::interval',
            this._onPanelStatesChanged.bind(this)
        );

        this.username = this.getUserName();
        let url = this.settings.get_value('url').unpack();
        this.setUrl(url);
        this.interval = this.settings.get_value('interval').unpack();

        // A label expanded and center aligned in the y-axis
        this.toplabel = this.buildLabel("Dev bar");

        
        // We add the box to the button
        // It will be showed in the Top Panel
        this.add_child(this.toplabel);

        this.addRefreshItem();
        this.addPreferencesItem();
        this.update();
    },
    openPreferences: function () {
        

        Util.spawn([
            "gnome-shell-extension-prefs",
            Me.uuid
        ]);
    },
    addPreferencesItem: function () {
        

        let item = new PopupMenu.PopupMenuItem("Preferences");
        item.connect('activate', Lang.bind(this, this.openPreferences));
        this.menu.addMenuItem(item);
    },
    addRefreshItem: function () {
        

        let item = new PopupMenu.PopupMenuItem("Refresh");

        item.connect('activate', Lang.bind(this, function () {
            this.loadWorkflowAsync(this.onWorkflowCallback);
        }));
        this.menu.addMenuItem(item);
    },
    setUrl: function (url) {
        

        if (url == "") {
            this.url = "";
        }
        else {
            this.url = url.endsWith("/") ? url + this.username : url + "/" + this.username;
        }
    },
    buildLabel: function (labelText) {
        

        return new St.Label({
            text: labelText,
            y_expand: true,
            y_align: Clutter.ActorAlign.CENTER
        });
    },
    update: function update() {
        
        if (this.stop) {

            Mainloop.source_remove(this._timeout);
            this._timeout = null;
            return;
        }

        if (this.url != "" && !this.menu.isOpen) {
            this.loadWorkflowAsync(this.onWorkflowCallback);
        }
        if (this._timeout) {
            Mainloop.source_remove(this._timeout);
            this._timeout = null;
        }
        this._timout = Mainloop.timeout_add_seconds(this.interval, Lang.bind(this, function mainloopTimeout() {
            

            this.update();
        }))
    },
    onWorkflowCallback: function (data) {
        

        this.updateLabel(data);
        this.updateMenu(data);
    },
    updateLabel: function (json) {
        

        this.currentCount = 0;
        let title = "";
        let displayObjects = json['metadata']['display'];
        let context = this;
        Object.keys(displayObjects).forEach(function (key) {

            let data = json['data'][key];
            let display = displayObjects[key];
            if (data && data.length > 0) {
                context.currentCount += 1 + data.length;
                title += display['symbol'] + data.length.toString() + "  ";
            }
        });
        if (title == "") {
            title = "✓";
        }
        this.toplabel.set_text(title);
    },
    updateMenu: function (json) {
        


        this.menu.removeAll();
        let displayObjects = json['metadata']['display'];
        let context = this;
        Object.keys(displayObjects).forEach(function (key) {

            let data = json['data'][key];
            let display = displayObjects[key];
            if (data && data.length > 0) {
                let item = null;
                if (context.currentCount > 40) {
                    item = new PopupMenu.PopupSubMenuMenuItem(display['title']);
                    item.menu.actor.style = 'max-height: 300px;';
                }
                else {
                    item = new PopupMenu.PopupMenuItem(display['title']);
                }
                context.menu.addMenuItem(item);
                for (let index in data) {
                    let issue = data[index];
                    let subItem = new PopupMenu.PopupMenuItem(issue['title']);
                    subItem.connect('activate', Lang.bind(context, function () {
                        Util.spawnCommandLine("xdg-open " + issue['url']);
                    }));
                    if (context.currentCount > 40) {
                        item.menu.addMenuItem(subItem);
                        
                    }
                    else {
                       
                        context.menu.addMenuItem(subItem);
                    }
                    
                }
            }

        });


        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        this.addRefreshItem();
        this.addPreferencesItem();

    },
    getUserName: function () {
        

        try {
            let [result, stdout, stderr] = GLib.spawn_command_line_sync("whoami");
            if (stdout != null) {
                return ByteArray.toString(stdout);
            }
        }
        catch (e) {
            global.log(e);
        }
        return "NO_USER";
    },
    loadWorkflowAsync: function loadWorkflowAsync(callback) {
        

        let context = this;
        let message = Soup.Message.new('GET', this.url);

        if (!_httpSession) {
            _httpSession = new Soup.SessionAsync();
            Soup.Session.prototype.add_feature.call(_httpSession, new Soup.ProxyResolverDefault());
        }
        _httpSession.queue_message(message, function soupQueue(session, message) {
            

            if (message.response_body.data) {
                try {
                    callback.call(context, JSON.parse(message.response_body.data));
                }
                catch (err) {
                    global.log(err.message);
                    context.toplabel.set_text("!");
                    
                }
            }

        });
    },
    _onPanelStatesChanged: function (settings, key) {
        

        // Read the new settings
        let url = this.settings.get_value('url').unpack();
        this.setUrl(url);
        this.interval = this.settings.get_value('interval').unpack();
    },

    destroy: function (params) {
        
        this.stop = true;
        if (_httpSession !== undefined)
            _httpSession.abort();
        _httpSession = undefined;

        if (this._timeout)
            Mainloop.source_remove(this._timeout);
        this._timeout = undefined;
        this.menu.removeAll();
        // Stop watching the settings for changes
        this.settings.disconnect(this._onUrlChangedId);
        this.settings.disconnect(this._onIntervalChangedId);
        this.parent();
        

    }
});

let indicator = null;

function init() {
    
}


function enable() {
    
    indicator = new DevBar;
    Main.panel.addToStatusArea(`${Me.metadata.name} Indicator`, indicator, 0, 'right');
}


function disable() {
    
    if (indicator !== null) {
        indicator.destroy();
        indicator = null;
        

    }
}
