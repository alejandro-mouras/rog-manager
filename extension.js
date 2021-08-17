/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

/* exported init */

const GETTEXT_DOMAIN = "my-indicator-extension";

const { GObject, St } = imports.gi;

const Gettext = imports.gettext.domain(GETTEXT_DOMAIN);
const _ = Gettext.gettext;

const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const Gio = imports.gi.Gio;
const Me = imports.misc.extensionUtils.getCurrentExtension();

function _makeLogFunction(prefix) {
  return (msg) => {
    // Grab the second line of a stack trace, i.e. caller of debug()
    let regex = /(?:(?:[^<.]+<\.)?([^@]+))?@(.+):(\d+):\d+/g;
    let trace = (msg.stack ? msg : new Error()).stack.split("\n")[1];
    let [m, func, file, line] = regex.exec(trace);
    file = GLib.path_get_basename(file);

    let hdr = [file, func, line].filter((k) => k).join(":");

    GLib.log_structured("rog-manager", GLib.LogLevelFlags.LEVEL_MESSAGE, {
      MESSAGE: `[${prefix}] [${hdr}]: ${msg}`,
      SYSLOG_IDENTIFIER: "org.gnome.shell.extensions.rogmanager",
      CODE_FILE: file,
      CODE_FUNC: `${func}`,
      CODE_LINE: `${line}`,
    });
  };
}

const RogManagerMenuButton = GObject.registerClass(
  class ROG_RogManagerMenuButton extends PanelMenu.Button {
    _init() {
      super._init(St.Align.START);
      this._settings = ExtensionUtils.getSettings();

      var _debugFunc = _makeLogFunction("DEBUG");
      this.debug = this._settings.get_boolean("debug") ? _debugFunc : () => {};

      this._settings.connect("changed::debug", () => {
        this.debug = this._settings.get_boolean("debug")
          ? _debugFunc
          : () => {};
      });

      let box = new St.BoxLayout({ style_class: "panel-status-menu-box" });
      box.add_child(
        new St.Icon({
          icon_name: "face-smile-symbolic",
          style_class: "system-status-icon",
        })
      );
      box.add_child(PopupMenu.arrowIcon(St.Side.BOTTOM));
      this.add_child(box);

      let item = new PopupMenu.PopupMenuItem(_("Show Notification"));
      item.connect("activate", () => {
        Main.notify(_("Whatʼs up, folks?"));
      });

      const GLib = imports.gi.GLib;
      let stuff = GLib.spawn_command_line_sync(
        "asusctl graphics -g"
      )[1].toString();
      log("asusctl", stuff);

      this._settingChangedSignals = [];
      this._addSettingChangedSignal(
        "update-time",
        this._updateTimeChanged.bind(this)
      );
      this._addSettingChangedSignal(
        "position-in-panel",
        this._positionInPanelChanged.bind(this)
      );
      this._addSettingChangedSignal(
        "panel-box-index",
        this._positionInPanelChanged.bind(this)
      );
      this.menu.addMenuItem(item);
    }

    _addSettingChangedSignal(key, callback) {
      this._settingChangedSignals.push(
        this._settings.connect("changed::" + key, callback)
      );
    }

    _positionInPanelChanged() {
      this.container.get_parent().remove_actor(this.container);

      // small HACK with private boxes :)
      let boxes = {
        left: Main.panel._leftBox,
        center: Main.panel._centerBox,
        right: Main.panel._rightBox,
      };

      let p = this.positionInPanel;
      let i = this._settings.get_int("panel-box-index");
      boxes[p].insert_child_at_index(this.container, i);
    }

    _onDestroy() {
      // Destroy AsusctlUtility

      for (let signal of this._settingChangedSignals) {
        this._settings.disconnect(signal);
      }
    }

    _updateTimeChanged() {
      Mainloop.source_remove(this._timeoutId);
      this._addTimer();
    }

    _addTimer() {
      this._timeoutId = Mainloop.timeout_add_seconds(
        this._settings.get_int("update-time"),
        () => {
          //   this._querySensors();
          // readd to update queue
          return true;
        }
      );
    }

    get positionInPanel() {
      return this._settings.get_string("position-in-panel");
    }
  }
);

let rogMenu;

function init(extensionMeta) {}

function enable() {
  rogMenu = new RogManagerMenuButton();
  Main.panel.addToStatusArea("rogMenu", rogMenu);
  rogMenu._positionInPanelChanged();
}

function disable() {
  rogMenu.destroy();
  rogMenu = null;
}

// class Extension {
//     constructor(uuid) {
//         this._uuid = uuid;

//         ExtensionUtils.initTranslations(GETTEXT_DOMAIN);
//     }

//     enable() {
//         this._indicator = new RogManagerMenuButton();

//         // Notification
//         const Main = imports.ui.main;
//         Main.notify('Message Title', 'Message Body');

//         Main.panel.addToStatusArea(this._uuid, this._indicator);
//     }

//     disable() {
//         this._indicator.destroy();
//         this._indicator = null;
//     }
// }

// function init(meta) {

//     // const Util = imports.misc.util;
//     // Util.spawn(['/bin/bash', 'asusctl', 'graphics', "-g"])
//     return new Extension(meta.uuid);
// }
