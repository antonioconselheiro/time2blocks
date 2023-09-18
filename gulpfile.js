const gulp = require('gulp');
const concat = require('gulp-concat');
const minify = require('gulp-minify');
const ts = require('gulp-typescript');
const rename = require('gulp-rename');
const javascriptLibraryBuild = ts.createProject('./tsconfig.js.json');
const typescriptLibraryBuild = ts.createProject('./tsconfig.ts.json');
const fs = require('fs');
let version = '';

//  Read package.json
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json'));
  version = packageJson.version;
} catch (e) {
  console.error('could not read package.json');
  throw e;
}

// Transpile
gulp.task('javascript-build', () => javascriptLibraryBuild.src()
  .pipe(javascriptLibraryBuild())
  .pipe(gulp.dest('.'))
);

gulp.task('typescript-build', () => typescriptLibraryBuild.src()
  .pipe(typescriptLibraryBuild())
  .pipe(gulp.dest('./build'))
);

//  Minify
gulp.task('javascript-minify', ['javascript-build'], () => gulp.src([
  './rawbuild/head.js', './build/time2blocks.bundle.js', './rawbuild/tail.js'
])
  .pipe(concat(`time2blocks.bundle.js`))
  .pipe(minify({
    ext: {
      src: '.js',
      min: '.min.js'
    }
  }))
  .pipe(gulp.dest('./build'))
);

gulp.task('javascript-minified-rename', ['javascript-minify'], () => gulp.src([
  'build/time2blocks.bundle.min.js'
])
  .pipe(rename(`time2blocks.bundle.${version}.min.js`))
  .pipe(gulp.dest('./build')));

//  copy docs
gulp.task('copy-documentation', () => gulp.src([
  'package.json', 'package-lock.json', '**.md', 'tsconfig.json', 'docs', 'LICENSE'
]).pipe(gulp.dest('./build')));

gulp.task('build', ['javascript-minified-rename', 'copy-documentation', 'typescript-build'], () => gulp.src([
  'docs/**'
]).pipe(gulp.dest('./build/docs')));