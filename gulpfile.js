var gulp        = require('gulp');
var browserSync = require('browser-sync');
var sass        = require('gulp-sass');
var prefix      = require('gulp-autoprefixer');
var cssnano     = require('gulp-cssnano');
var uglify      = require('gulp-uglify');
var babel       = require('gulp-babel');

/**
 * Compile files from _scss into both _site/css (for live injecting) and site (for future Jekyll builds)
 */
function styles() {
  return gulp.src(['src/scss/styles.scss'])
    .pipe(sass({
      includePaths: ['scss'],
      onError: browserSync.notify
    }))
    .pipe(prefix(['last 3 versions'], { cascade: true }))
    .pipe(gulp.dest('public/css/'))
    .pipe(browserSync.reload({ stream: true }))
}

function stylesProd() {
  return gulp.src(['src/scss/styles.scss'])
    .pipe(sass({
      includePaths: ['scss'],
      onError: browserSync.notify
    }))
    .pipe(prefix(['last 3 versions'], { cascade: true }))
    .pipe(cssnano())
    .pipe(gulp.dest('public/css/'))
}

function scripts() {
  return gulp.src([
    'src/js/broadcast.js',
    'src/js/guest.js',
    'src/js/host.js',
    'src/js/index.js',
    'src/js/viewer.js'
  ])
    .pipe(babel({
      'presets': [ '@babel/preset-env' ]
    }))
    .pipe(gulp.dest('public/js/'))
    .pipe(browserSync.reload({ stream: true }))
}

function scriptsProd() {
  return gulp.src([
    'src/js/broadcast.js',
    'src/js/guest.js',
    'src/js/host.js',
    'src/js/index.js',
    'src/js/viewer.js'
  ])
    .pipe(babel({
      'presets': [ '@babel/preset-env' ]
    }))
    .pipe(uglify())
    .pipe(gulp.dest('public/js/'))
    .pipe(browserSync.reload({ stream: true }))
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
  gulp.watch(['src/js'], scripts);
}

function watchStyles() { 
  gulp.watch(['src/scss/styles.scss'], styles)
}

var compile = gulp.parallel(styles, scripts)
var serve = gulp.series(compile, browserSyncServe)
var watch = gulp.parallel(watchMarkup, watchStyles, watchScripts)

/**
 * Default task, running just `gulp` will compile the sass,
 * compile the Jekyll site, launch BrowserSync & watch files.
 */
gulp.task('default', gulp.parallel(serve, watch))
gulp.task('build', stylesProd)