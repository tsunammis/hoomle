'use strict';

// Include Gulp and other build automation tools and utilities
// See: https://github.com/gulpjs/gulp/blob/master/docs/API.md
var gulp = require('gulp');
var $ = require('gulp-load-plugins')();
var del = require('del');
var path = require('path');
var runSequence = require('run-sequence');
var webpack = require('webpack');
var argv = require('minimist')(process.argv.slice(2));

// Settings
var DEST = './build';                         // The build output folder
var RELEASE = !!argv.release;                 // Minimize and optimize during a build?
var AUTOPREFIXER_BROWSERS = [                 // https://github.com/ai/autoprefixer
    'ie >= 10',
    'ie_mob >= 10',
    'ff >= 30',
    'chrome >= 34',
    'safari >= 7',
    'opera >= 23',
    'ios >= 7',
    'android >= 4.4',
    'bb >= 10'
];

var src = {};
var watch = false;
var browserSync;

// The default task
gulp.task('default', ['sync']);

// Clean up
gulp.task('clean', del.bind(null, [DEST]));

// 3rd party libraries
gulp.task('vendor', function() {
    return gulp.src('./node_modules/bootstrap/dist/fonts/**')
        .pipe(gulp.dest(DEST + '/fonts'));
});

// Static files
gulp.task('assets', function() {
    src.assets = [
        'src/assets/**'
    ];
    return gulp.src(src.assets)
        .pipe($.changed(DEST))
        .pipe(gulp.dest(DEST))
        .pipe($.size({title: 'assets'}));
});

// CSS style sheets
gulp.task('styles', function() {
    src.styles = [
        'src/styles/bootstrap.less',
        'src/components/**/*.{css,less}'
    ];
    return gulp.src(src.styles)
        .pipe($.plumber())
        .pipe($.less({
            sourceMap: !RELEASE,
            sourceMapBasepath: __dirname
        }))
        .on('error', console.error.bind(console))
        .pipe($.autoprefixer({browsers: AUTOPREFIXER_BROWSERS}))
        .pipe($.csscomb())
        .pipe($.if(RELEASE, $.minifyCss()))
        .pipe($.concat('styles.css'))
        .pipe(gulp.dest(DEST + '/css'))
        .pipe($.size({title: 'styles'}));
});

// Bundle
gulp.task('bundle', function(cb) {
    var started = false;
    var config = require('./webpack.config.js');
    var bundler = webpack(config);

    function bundle(err, stats) {
        if (err) {
            throw new $.util.PluginError('webpack', err);
        }

        if (argv.verbose) {
            $.util.log('[webpack]', stats.toString({colors: true}));
        }

        if (!started) {
            started = true;
            return cb();
        }
    }

    if (watch) {
        bundler.watch(200, bundle);
    } else {
        bundler.run(bundle);
    }
});

// Build the app from source code
gulp.task('build', ['clean'], function(cb) {
    runSequence(['vendor', 'assets', 'styles', 'bundle'], cb);
});

// Build and start watching for modifications
gulp.task('build:watch', function(cb) {
    watch = true;

    runSequence('build', function() {
        gulp.watch(src.assets, ['assets']);
        gulp.watch(src.styles, ['styles']);
        cb();
    });
});

// Launch a Node.js/Express server
gulp.task('serve', ['build:watch'], function(cb) {
    src.server = [
        DEST + '/server.js',
        DEST + '/content/**/*',
        DEST + '/templates/**/*'
    ];

    var started = false;
    var cp = require('child_process');
    var assign = require('react/lib/Object.assign');

    var server = (function startup() {
        var child = cp.fork(DEST + '/server.js', {
            env: assign({ NODE_ENV: 'development' }, process.env)
        });
        child.once('message', function(message) {
            if (message.match(/^online$/)) {
                if (browserSync) {
                    browserSync.reload();
                }
                if (!started) {
                    started = true;
                    gulp.watch(src.server, function(file) {
                        $.util.log('Restarting development server.');
                        server.kill('SIGTERM');
                        server = startup();
                    });
                    cb();
                }
            }
        });
        return child;
    })();

    process.on('exit', function() {
        server.kill('SIGTERM');
    });
});

// Launch BrowserSync development server
gulp.task('sync', ['serve'], function(cb) {
    browserSync = require('browser-sync');

    browserSync({
        notify: false,
        // Run as an https by setting 'https: true'
        // Note: this uses an unsigned certificate which on first access
        //       will present a certificate warning in the browser.
        https: false,
        // Informs browser-sync to proxy our Express app which would run
        // at the following location
        proxy: 'localhost:5000'
    }, cb);

    process.on('exit', function () {
        browserSync.exit();
    });

    gulp.watch([DEST + '/**/*.*'].concat(
        src.server.map(function(file) {return '!' + file;})
    ), function(file) {
        browserSync.reload(path.relative(__dirname, file.path));
    });
});
