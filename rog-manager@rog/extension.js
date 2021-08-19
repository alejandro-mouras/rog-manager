const { GObject, St } = imports.gi;
const Main = imports.ui.main;
const Util = imports.misc.util;
const Mainloop = imports.mainloop;
const Clutter = imports.gi.Clutter;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const AsusctlUtil = Me.imports.asusctlUtil;
const AsusItem = Me.imports.asusItem;

const Gettext = imports.gettext.domain(Me.metadata["gettext-domain"]);
const _ = Gettext.gettext;

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
        this.debug = this._settings.get_boolean("debug") ? _debugFunc : () => {};
      });

      this._utils = {
        asus: new AsusctlUtil.AsusctlUtil(),
      };

      this._menuLayout = new St.BoxLayout();
      this._hotLabels = {};

      this._createInitialIcon();

      this.add_actor(this._menuLayout);

      // let box = new St.BoxLayout({ style_class: "panel-status-menu-box" });
      // box.add_child(
      //   new St.Icon({
      //     icon_name: "face-smile-symbolic",
      //     style_class: "system-status-icon",
      //   })
      // );
      // box.add_child(PopupMenu.arrowIcon(St.Side.BOTTOM));
      // this.add_child(box);

      // let item = new PopupMenu.PopupMenuItem(_("Show Notification"));
      // item.connect("activate", () => {
      //   Main.notify(_("Whatʼs up, folks?"));
      // });

      const GLib = imports.gi.GLib;
      let stuff = GLib.spawn_command_line_sync("asusctl graphics -g")[1].toString();
      global.log("asusctl", stuff);

      this._settingChangedSignals = [];
      // this._addSettingChangedSignal("drive-utility", this._driveUtilityChanged.bind(this));
      this._addSettingChangedSignal("update-time", this._updateTimeChanged.bind(this));
      this._addSettingChangedSignal("position-in-panel", this._positionInPanelChanged.bind(this));
      this._addSettingChangedSignal("panel-box-index", this._positionInPanelChanged.bind(this));

      this.connect("destroy", this._onDestroy.bind(this));

      // TODO:  Query asusctl
      this._queryAsusCtl();

      this._addTimer();

      // Update UI
      this._updateUI(true);
      // this._updateUITimeoutId = Mainloop.timeout_add(250, () => {
      //   this._updateUI();
      //   // readd to update queue
      //   return true;
      // });
    }

    _queryAsusCtl() {
      for (let asus of Object.values(this._utils)) {
        asus.execute(() => {
          // we cannot change actor in background thread #74
        });
      }
    }

    _updateUI(needUpdate = false) {
      // CHEQUEAR SI CAMBIA ALGO PARA ACTUALIZAR
      this._updateDisplay(); // #74
      this.debug("update display");
    }

    _updateDisplay() {
      let asusctlInfo = this._utils.asus.asusHealth;

      let profileInfo = this._utils.asus.availableProfiles;
      global.log("asusctlInfo: ", asusctlInfo);

      if (asusctlInfo) {
        let asus = [];

        // Profiles
        if (profileInfo.length > 0) {
          for (let i of profileInfo) {
            asus.push({
              type: "profile",
              label: _(i),
              value: i,
              displayName: this.capitalizeFirstLetter(i),
            });
          }
        }

        this.debug("Render all MenuItems");
        this.menu.removeAll();
        this._appendMenuItems(asus);
      } else {
        this._sensorMenuItems = {};
        this.menu.removeAll();

        let item = new PopupMenu.PopupMenuItem(_("Please install asusctl.\n"));
        this.menu.addMenuItem(item);
        this._appendStaticMenuItems();
      }
    }

    _appendStaticMenuItems() {
      // separator
      this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

      let settings = new PopupMenu.PopupBaseMenuItem();
      settings.actor.add_child(
        new St.Label({ text: _("Rog Manager Settings"), x_align: Clutter.ActorAlign.CENTER, x_expand: true })
      );
      settings.connect("activate", function () {
        Util.spawn(["gnome-extensions", "prefs", Me.metadata.uuid]);
      });
      this.menu.addMenuItem(settings);
    }

    _appendMenuItems(asus) {
      // Profile
      let profileGroup = new PopupMenu.PopupSubMenuMenuItem(_("Profiles"), true);
      let profileOptions = [];
      let actProf = this._utils.asus.actualProfile;
      this.menu.addMenuItem(profileGroup);
      for (let s of asus) {
        let key = s.key || s.label;
        let item = new AsusItem.AsusItem(key, s.label, s.value, s.displayName || undefined);
        profileGroup.menu.addMenuItem(item);

        profileOptions.push(item);
        if (actProf == key) {
          item.main = true;
        }

        item.connect("activate", (self) => {
          let l = self.key;

          if (l) {
            self.main = true;
            this._utils.asus.newProfile = l;

            Main.notify(_("Profile change to " + l));
          }
          for (let i of profileOptions) {
            if (i.key != self.key) {
              i.main = false;
            }
          }
        });
      }

      // Graphics
      let graphicsGroup = new PopupMenu.PopupSubMenuMenuItem(_("Graphics"), true);
      this.menu.addMenuItem(graphicsGroup);
      // Charge Limit
      let chargeLimitGroup = new PopupMenu.PopupSubMenuMenuItem(_("Charge Limit"), true);
      this.menu.addMenuItem(chargeLimitGroup);

      // Keyboard LED
      this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
      let ledKeyGroup = new PopupMenu.PopupSubMenuMenuItem(_("Keyboard Led"), true);
      this.menu.addMenuItem(ledKeyGroup);
      let brightKeyGroup = new PopupMenu.PopupSubMenuMenuItem(_("Keyboard Bright"), true);
      this.menu.addMenuItem(brightKeyGroup);
      let ledKeyModeGroup = new PopupMenu.PopupSubMenuMenuItem(_("Keyboard Led Mode"), true);
      this.menu.addMenuItem(ledKeyModeGroup);

      // Anime
      this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
      let animeGroup = new PopupMenu.PopupSubMenuMenuItem(_("Anime Matrix"), true);
      this.menu.addMenuItem(animeGroup);
      let animeBrightGroup = new PopupMenu.PopupSubMenuMenuItem(_("Anime Matrix Bright"), true);
      this.menu.addMenuItem(animeBrightGroup);

      this._appendStaticMenuItems();
    }

    _createInitialIcon() {
      this._initialIcon = new St.Icon(); //{ style_class: "system-status-icon" }
      this._initialIcon.gicon = Gio.icon_new_for_string(Me.path + "/icons/rog-icon-white.svg");
      this._menuLayout.add(this._initialIcon);
    }

    _addSettingChangedSignal(key, callback) {
      this._settingChangedSignals.push(this._settings.connect("changed::" + key, callback));
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
      // TODO: Destroy AsusctlUtility
      Mainloop.source_remove(this._timeoutId);
      Mainloop.source_remove(this._updateUITimeoutId);
      for (let signal of this._settingChangedSignals) {
        this._settings.disconnect(signal);
      }
    }

    _updateTimeChanged() {
      Mainloop.source_remove(this._timeoutId);
      this._addTimer();
    }

    _addTimer() {
      this._timeoutId = Mainloop.timeout_add_seconds(this._settings.get_int("update-time"), () => {
        this._queryAsusCtl();
        // readd to update queue
        return true;
      });
    }

    capitalizeFirstLetter(string) {
      return string.charAt(0).toUpperCase() + string.slice(1);
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
