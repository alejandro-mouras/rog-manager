NAME=rog-manager@rog
glib-compile-schemas $NAME/schemas
rm -rf ~/.local/share/gnome-shell/extensions/$NAME
cp -r $NAME ~/.local/share/gnome-shell/extensions/.