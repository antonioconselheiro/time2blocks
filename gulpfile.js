const gulp = require('gulp');
const ts = require('gulp-typescript');
const typescriptBuild = ts.createProject('./tsconfig.json');

// Transpile
gulp.task('typescript-build', () => typescriptBuild.src()
  .pipe(typescriptBuild())
  .pipe(gulp.dest('./dist'))
);

//  copy docs
gulp.task('copy-documentation', () => gulp.src([
  'package.json', 'package-lock.json', '**.md', 'tsconfig.json', 'docs', 'LICENSE'
]).pipe(gulp.dest('./dist')));

gulp.task('build', gulp.series('copy-documentation', 'typescript-build', () => gulp.src([
  'docs/**'
]).pipe(gulp.dest('./dist/docs'))));
