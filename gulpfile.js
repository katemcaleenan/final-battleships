var gulp = require('gulp');
var useref = require('gulp-useref');
var browserSync = require('browser-sync');
var terser = require("gulp-terser");
var gulpIf = require('gulp-if');
var uglifycss = require('gulp-uglifycss');

gulp.task('js', function(){
  return gulp.src('public/*.html')
  .pipe(useref())
  // Minifies only if it's a JavaScript file
  .pipe(gulpIf('*.js', terser()))
  .pipe(gulp.dest('dist'))
});

gulp.task('css', function () {
  gulp.src('public/*.css')
    .pipe(uglifycss({
      "maxLineLen": 80,
      "uglyComments": true
    }))
    .pipe(gulp.dest('dist'));
});

// Watchersx
// watch files and tell if there is any chanes, detects change and run the tasks associated
gulp.task('watch', function() {
  gulp.watch('public/*.html', browserSync.reload);
  gulp.watch('public/*.js', browserSync.reload);
  gulp.watch('public/*.css', browserSync.reload);
})

gulp.task('default', gulp.parallel('js','css', 'watch'));


  