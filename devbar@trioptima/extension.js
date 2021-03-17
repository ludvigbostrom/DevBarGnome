'use strict';

const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;
const St = imports.gi.St;
const Clutter = imports.gi.Clutter;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Soup = imports.gi.Soup;
const Util = imports.misc.util;
const Mainloop = imports.mainloop;
const ByteArray = imports.byteArray;

var DevBar = GObject.registerClass({},
    class DevBar extends PanelMenu.Button {
        _init() {
            super._init(1, `${Me.metadata.name} Indicator`, false);
            // Initialize stop variable
            this.stop = false;
            // Set up runtime settings and defaults
            this.settings = this.setUpSettings();
            this.setUpSettingsWatchers();
            this.username = this.getUserName();
            this.url = this.setUpUrl();
            this.interval = this.settings.get_value('interval').unpack();
            this.toplabel = this.buildLabel('Dev bar');

            // Add label to panel menu button
            this.add_child(this.toplabel);

            // Add refresh button
            this.addRefreshItem();
            // Add preferences button
            this.addPreferencesItem();
            // Start update loop
            this.update();
        }

        setUpSettings() {
            let gschema = Gio.SettingsSchemaSource.new_from_directory(
                Me.dir.get_child('schemas').get_path(),
                Gio.SettingsSchemaSource.get_default(),
                false
            );

            return new Gio.Settings({
                settings_schema: gschema.lookup('org.gnome.shell.extensions.devbar', true),
            });
        }

        setUpSettingsWatchers() {
            this._onUrlChangedId = this.settings.connect(
                'changed::url',
                this._onPanelStatesChanged.bind(this)
            );
            this._onIntervalChangedId = this.settings.connect(
                'changed::interval',
                this._onPanelStatesChanged.bind(this)
            );
        }

        setUpUrl() {
            const url = this.settings.get_value('url').unpack();
            if (url === '')
                return '';
            else
                return url.endsWith('/') ? url + this.username : `${url}/${this.username}`;
        }

        getUserName() {
            try {
                let [stdout] = GLib.spawn_command_line_sync('whoami');
                if (stdout !== null)
                    return ByteArray.toString(stdout);
            } catch (e) {
            }
            return 'NO_USER';
        }

        openPreferences() {
            Util.spawn([
                'gnome-shell-extension-prefs',
                Me.uuid,
            ]);
        }

        addPreferencesItem() {
            let item = new PopupMenu.PopupMenuItem('Preferences');
            item.connect('activate', this.openPreferences);
            this.menu.addMenuItem(item);
        }

        addRefreshItem() {
            let item = new PopupMenu.PopupMenuItem('Refresh');

            item.connect('activate', function () {
                this.loadWorkflowAsync(this.onWorkflowCallback);
            }.bind(this));
            this.menu.addMenuItem(item);
        }

        buildLabel(labelText) {
            return new St.Label({
                text: labelText,
                y_expand: true,
                y_align: Clutter.ActorAlign.CENTER,
            });
        }

        update() {
            if (this.stop) {
                Mainloop.source_remove(this._timeout);
                this._timeout = null;
                return;
            }

            if (this.url !== '' && !this.menu.isOpen)
                this.loadWorkflowAsync(this.onWorkflowCallback);
            if (this._timeout) {
                Mainloop.source_remove(this._timeout);
                this._timeout = null;
            }
            this._timout = Mainloop.timeout_add_seconds(this.interval, function mainloopTimeout() {
                this.update();
            }.bind(this));
        }

        onWorkflowCallback(data) {
            this.updateLabel(data);
            this.updateMenu(data);
        }

        updateLabel(json) {
            this.currentCount = 0;
            let title = '';
            let displayObjects = json['metadata']['display'];
            let context = this;
            Object.keys(displayObjects).forEach(function (key) {
                let data = json['data'][key];
                let display = displayObjects[key];
                if (data && data.length > 0) {
                    context.currentCount += 1 + data.length;
                    title += `${display['symbol'] + data.length.toString()}  `;
                }
            });
            if (title === '')
                title = '✓';
            this.toplabel.set_text(title);
        }

        updateMenu(json) {
            this.menu.removeAll();
            let displayObjects = json['metadata']['display'];
            Object.keys(displayObjects).forEach(function (key) {
                let data = json['data'][key];
                let display = displayObjects[key];
                if (data && data.length > 0) {
                    let item = null;
                    if (this.currentCount > 25) {
                        item = new PopupMenu.PopupSubMenuMenuItem(display['title']);
                        item.menu.actor.style = 'max-height: 300px;';
                    } else {
                        item = new PopupMenu.PopupMenuItem(display['title']);
                    }
                    this.menu.addMenuItem(item);
                    for (let index in data) {
                        let issue = data[index];
                        let subItem = new PopupMenu.PopupMenuItem(issue['title']);
                        subItem.connect('activate', function () {
                            Util.spawnCommandLine(`xdg-open ${issue['url']}`);
                        });
                        if (this.currentCount > 25)
                            item.menu.addMenuItem(subItem);
                        else
                            this.menu.addMenuItem(subItem);
                    }
                }
            }.bind(this));

            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
            this.addRefreshItem();
            this.addPreferencesItem();
        }

        loadWorkflowAsync(callback) {
            let context = this;
            let message = Soup.Message.new('GET', this.url);

            if (!this.httpSession) {
                this.httpSession = new Soup.SessionAsync();
                Soup.Session.prototype.add_feature.call(this.httpSession, new Soup.ProxyResolverDefault());
            }
            this.httpSession.queue_message(message, function soupQueue(_, msg) {
                if (msg.response_body.data) {
                    try {
                        callback.call(context, JSON.parse(msg.response_body.data));
                    } catch (err) {
                        context.toplabel.set_text('!');
                    }
                } else {
                    context.toplabel.set_text('!');
                }
            });
        }

        _onPanelStatesChanged() {
            this.url = this.setUpUrl();
            this.interval = this.settings.get_value('interval').unpack();
        }

        destroy() {
            this.stop = true;
            if (this.httpSession !== undefined)
                this.httpSession.abort();
            this.httpSession = undefined;

            if (this._timeout)
                Mainloop.source_remove(this._timeout);
            this._timeout = undefined;
            this.menu.removeAll();

            this.settings.disconnect(this._onUrlChangedId);
            this.settings.disconnect(this._onIntervalChangedId);
            this.parent();
        }
    });

let indicator = null;

// eslint-disable-next-line no-unused-vars
function init() {
}


// eslint-disable-next-line no-unused-vars
function enable() {
    indicator = new DevBar();
    Main.panel.addToStatusArea(`${Me.metadata.name} Indicator`, indicator, 0, 'right');
}

// eslint-disable-next-line no-unused-vars
function disable() {
    if (indicator !== null) {
        indicator.destroy();
        indicator = null;
    }
}
