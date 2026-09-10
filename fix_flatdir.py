from pathlib import Path
root = Path(r"C:\Users\minji\Desktop\object\bike-scenery\android")

app = root / "app" / "build.gradle"
t = app.read_text(encoding="utf-8")
old = """repositories {
    flatDir{
        dirs '../capacitor-cordova-android-plugins/src/main/libs', 'libs'
    }
}

"""
if old not in t:
    raise SystemExit("app flatDir block not found")
# Keep repositories empty removed entirely - no other repos needed in app module (google/maven are in settings)
t = t.replace(old, "", 1)
app.write_text(t, encoding="utf-8")
print("removed app flatDir")

cordova = root / "capacitor-cordova-android-plugins" / "build.gradle"
ct = cordova.read_text(encoding="utf-8")
old2 = """repositories {
    google()
    mavenCentral()
    flatDir{
        dirs 'src/main/libs', 'libs'
    }
}
"""
new2 = """repositories {
    google()
    mavenCentral()
}
"""
if old2 not in ct:
    raise SystemExit("cordova flatDir block not found")
cordova.write_text(ct.replace(old2, new2, 1), encoding="utf-8")
print("removed cordova flatDir")
