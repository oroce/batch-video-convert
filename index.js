var ffmpeg = require( "fluent-ffmpeg" );

var Metadata = ffmpeg.Metadata;

var path = require( "path" );

var mkdirp = require( "mkdirp" );

var fs = require( "fs" );

var sourceDir = process.argv[ 2 ];

var targetDir = process.argv[ 3 ]||path.resolve( path.join( sourceDir, "..", "result" ) );

var async = require( "async" );

var tasks = fs.readdirSync( sourceDir )
	.filter(function( dir ){
		return fs.statSync( path.join( sourceDir, dir ) ).isDirectory();
	})
	.map(function( dir ){
		dir = path.join( sourceDir, dir );
		var files = fs.readdirSync( dir );
		var file = files.filter(function( fileName ){
			return path.extname( fileName ) === ".mp4";
		})[ 0 ];
		if( !file ){
			console.warn( "Did not found mp4 file in dir: %s", dir );
		}
		return file ? path.join( dir, file ) : null;
	})
	.filter(function( file ){
		return file != null;
	})
	.map(function( file ){
		var rel = path.relative( sourceDir, file );
		var targetFile = path.join( targetDir, rel );
		return {
			sourceFile: file,
			targetFile: targetFile
		};
	})
	.map(function( file ){
		mkdirp.sync( path.dirname( file.targetFile ) );
		return file;
	});

function writeTasks( taskList ){
	var conf = taskList.map(function( task ){
		var cmd = [ "ffmpeg" ];
		task.options.forEach(function( option ){
			cmd.push( option.name, option.value );
		});
		cmd.push( '"' + task.targetFile + '"' );
		return {
			cmd: cmd.join( " " ),
			done: false
		};
	});
	var fileName = path.join( __dirname, "tasks.json");
	fs.writeFileSync( fileName, JSON.stringify( conf ) );
	console.log( "Config written to %s", fileName );
	process.exit();
}

async.forEachSeries( tasks, function( task, cb ){
	console.log( "processing %s of %s has been started", tasks.indexOf( task ), tasks.length );
	new Metadata( '"' + task.sourceFile + '"' )
		.get(function( metadata, err ){
			console.log( "processing %s of %s is done", tasks.indexOf( task ), tasks.length );
			if( err ){
				return cb( err );
			}
			//"movie="+ this.watermarkLogo +", scale=99:35 [watermark]; [in]scale=" + config.sizes.sd.width + ":trunc(ow/a/2)*2 [scale]; [scale][watermark] overlay=main_w-overlay_w-10:main_h-overlay_h-10 [out]")

			task.options = [{
				"name":  "-i",
				"value": '"' + task.sourceFile + '"'
			}, {
				"name":  "-vf",
				"value": '"[in] hflip [hflip]; [hflip] fade=in:0:60 [out]"'
			}, {
				"name":  "-strict",
				"value": "-2"
			}, {
				"name":  "-preset",
				"value": "veryfast"
			}];
			if( metadata.durationsec < 900 ){

			}
			else{
				task.options.unshift({
					name: "-ss",
					value: Math.round((metadata.durationsec - 900 ) / 2)
				});
				task.options.push({
					name: "-t",
					value: 900
				});
			}
			cb();
		});
}, function( err ){
	if( err ){
		console.error( err );
	}
	writeTasks( tasks );
});
