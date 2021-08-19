
#!/bin/sh
NAME=rog-manager@rog
glib-compile-schemas $NAME/schemas
cd $NAME
zip -r $NAME.zip *
cd ..
mv $NAME/$NAME.zip .