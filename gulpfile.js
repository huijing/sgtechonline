var gulp        = require('gulp');
var browserSync = require('browser-sync');
var sass        = require('gulp-sass');
var prefix      = require('gulp-autoprefixer');
var cssnano     = require('gulp-cssnano');

/**
 * Compile files from _scss into both _site/css (for live injecting) and site (for future Jekyll builds)
 */
function styles() {
  return gulp.src(['public/css/src/styles.scss'])
    .pipe(sass({
      includePaths: ['scss'],
      onError: browserSync.notify
    }))
    .pipe(prefix(['last 3 versions'], { cascade: true }))
    .pipe(gulp.dest('public/css/'))
    .pipe(browserSync.reload({ stream: true }))
}

function stylesProd() {
  return gulp.src(['public/css/src/styles.scss'])
    .pipe(sass({
      includePaths: ['scss'],
      onError: browserSync.notify
    }))
    .pipe(prefix(['last 3 versions'], { cascade: true }))
    .pipe(cssnano())
    .pipe(gulp.dest('public/css/'))
}

/**
 * Server functionality handled by BrowserSync
 */
function browserSyncServe(done) {
  browserSync.init({
    proxy: 'localhost:8080'
  })
  done();
}

function browserSyncReload(done) {
  browserSync.reload();
  done();
}

/**
 * Watch source files for changes & recompile
 * Watch html/md files, run Jekyll & reload BrowserSync
 */
function watchMarkup() {
  gulp.watch(['views/**/*.ejs'], browserSyncReload);
}

function watchScripts() {
  gulp.watch(['public/js'], browserSyncReload);
}

function watchStyles() { 
  gulp.watch(['public/css/src/styles.scss'], styles)
}

var serve = gulp.series(styles, browserSyncServe)
var watch = gulp.parallel(watchMarkup, watchStyles, watchScripts)

/**
 * Default task, running just `gulp` will compile the sass,
 * compile the Jekyll site, launch BrowserSync & watch files.
 */
gulp.task('default', gulp.parallel(serve, watch))
gulp.task('build', stylesProd)