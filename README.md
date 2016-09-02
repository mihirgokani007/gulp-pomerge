# [gulp](http://gulpjs.com)-pomerge

> Merge multiple PO files avoiding duplicates


## Install

Install with [npm][1]

```sh
npm install --save-dev gulp-pomerge
```


## API

```js
var gulp = require('gulp');
var pomerge = require('gulp-pomerge');

gulp.task('translations:merge', function () {
    return gulp.src('po/**/*.po')
        .pipe(pomerge('merged.po'))
        .pipe(gulp.dest('dist/translations/'));
});
```


# End Matter

## Author

[Mihir Gokani][0]

## License

Licensed under MIT.


[0]: https://github.com/mihirgokani007
[1]: https://npmjs.org/package/gulp-pomerge
[2]: https://github.com/rubenv/pofile#the-poitem-class
