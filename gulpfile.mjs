import { deleteAsync } from 'del';
import gulp from 'gulp';
import cleanPackageJson from 'gulp-clean-package';
import gulpSourceMaps from 'gulp-sourcemaps';
import gulpTypescript from 'gulp-typescript';
import mergeStream from 'merge-stream';
import path from 'path';

const buildDir = 'dist';

// Helpers
function tsCompilerFactory(outPath, settings) {
	return function compileTS() {
		const tsProject = gulpTypescript.createProject('tsconfig.json', settings);

		return gulp
			.src(['src/**/!(*.test).{ts,tsx}', '!src/**/__tests__/**'])
			.pipe(gulpSourceMaps.init())
			.pipe(tsProject())
			.pipe(gulpSourceMaps.write('./sourcemaps'))
			.pipe(gulp.dest(outPath));
	};
}

function copyNotTranspilableSourcesFactory(outPath) {
	return function copyNotTranspilableSources() {
		return gulp.src([`src/**/!(*.test).{js,d.ts}`]).pipe(gulp.dest(outPath));
	};
}

// Main
function buildESM() {
	const out = buildDir;

	return gulp.parallel([
		// Compile TS files
		Object.assign(tsCompilerFactory(out, { module: 'esnext' }), {
			displayName: 'TSC:esnext',
		}),

		// Copy js files and declarations
		Object.assign(copyNotTranspilableSourcesFactory(out), {
			displayName: 'CopyPureSources:esnext',
		}),
	]);
}

function copyMetaFiles() {
	return mergeStream(
		gulp.src('assets/*', { encoding: false }).pipe(gulp.dest(path.join(buildDir, 'assets'))),
		mergeStream(
			// Clean package.json
			gulp
				.src(['./package.json'])
				.pipe(cleanPackageJson({ publicProperties: ['publishConfig'] })),
			// Copy other
			gulp.src(['README.md', 'LICENSE']),
		).pipe(gulp.dest(buildDir)),
	);
}

function clean() {
	return deleteAsync(buildDir);
}

// Compilations
const fullBuild = gulp.series([clean, copyMetaFiles, buildESM()]);

export default fullBuild;
