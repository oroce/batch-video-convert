var spawn = require( "child_process" ).spawn;

var fs = require( "fs" );

var taskFileName = "./tasks.json";

var tasks = require( taskFileName );

var async = require( "async" );

function status(){
	var todoTasks = tasks.filter(function( task ){
		return task.done === false;
	});
	console.log( "Need to do %s of %s tasks.", todoTasks.length, tasks.length );
}

function writeTasksStatus(){
	fs.writeFileSync( taskFileName, JSON.stringify( tasks ) );
}

async.forEachSeries( tasks, function( task, cb ){
	if( task.done === true ){
		return cb();
	}

	var child = spawn( task.cmd );
	child
		.on( "error", console.error.bind( console ) )
		.on( "error", function( err ){
			cb( err );
		})
		.on( "exit", function(){
			task.done = true;
			writeTasksStatus();
			status();
			cb();
		});
	child.stderr.pipe( process.stderr, {
		end: false
	});
	child.stdout.pipe( process.stdout, {
		end: false
	});

}, function( err ){
	if( err ){
		console.error( err );
	}
	process.exit( 0 );
});