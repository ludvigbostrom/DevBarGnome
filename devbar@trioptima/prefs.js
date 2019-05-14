'use strict';

const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();


function init() {
}

function buildPrefsWidget() {

    // Copy the same GSettings code from `extension.js`
    let gschema = Gio.SettingsSchemaSource.new_from_directory(
        Me.dir.get_child('schemas').get_path(),
        Gio.SettingsSchemaSource.get_default(),
        false
    );

    this.settings = new Gio.Settings({
        settings_schema: gschema.lookup('org.gnome.shell.extensions.devbar', true)
    });

    // Create a parent widget that we'll return from this function
    let prefsWidget = new Gtk.Grid({
        margin: 18,
        column_spacing: 12,
        row_spacing: 12,
        visible: true
    });

    // Add a simple title and add it to the prefsWidget
    let title = new Gtk.Label({
        // As described in "Extension Translations", the following template
        // lit
        // prefs.js:88: warning: RegExp literal terminated too early
        //label: `<b>${Me.metadata.name} Extension Preferences</b>`,
        label: '<b>' + Me.metadata.name + ' Extension Preferences</b>',
        halign: Gtk.Align.START,
        use_markup: true,
        visible: true
    });
    prefsWidget.attach(title, 0, 0, 2, 1);

    let urlLabel = new Gtk.Label({
        label: 'Url:',
        halign: Gtk.Align.START,
        visible: true
    
    });
    prefsWidget.attach(urlLabel, 0,3,1,1);

    let inputField = new Gtk.Entry({
        text: this.settings.get_string('url'),
        halign: Gtk.Align.END,
        visible: true
    });
    prefsWidget.attach(inputField, 1, 3, 1, 1);
    this.settings.bind('url', inputField, 'text', Gio.SettingsBindFlags.DEFAULT);

    let intervalLabel = new Gtk.Label({
        label: 'Refresh interval (s):',
        halign: Gtk.Align.START,
        visible: true
    });
    prefsWidget.attach(intervalLabel, 0,4,1,1);
    let refreshInterval = new Gtk.SpinButton({
        adjustment: new Gtk.Adjustment({
            lower: 1,
            upper: 500,
            step_increment: 1
        }),
        halign: Gtk.Align.END,
        visible: true
    });
    prefsWidget.attach(refreshInterval, 1, 4, 1, 1);
    this.settings.bind('interval', refreshInterval, 'value', Gio.SettingsBindFlags.DEFAULT);
    // Return our widget which will be added to the window
    return prefsWidget;
}
