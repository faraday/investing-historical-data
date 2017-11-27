var fs = require( 'fs' );
var request = require( 'request' );
var cheerio = require( 'cheerio' );
var Promise = require( 'promise' );
var program = require( 'commander' );

var pairs = require('./investing-pairs');

// ================= parse program arguments

program.version( '0.0.1' )
    .option( '-i --id [id]', 'id of the pair to fetch' )
    .option( '-p --period [period]', 'time period in seconds (5 minutes = 300)')
    .option( '-f --file [file]', 'result file. If none, the result will be printed to the console.' )
    .option( '-v --verbose', 'enable verbose mode.' )
    .parse( process.argv );

var verbose = program.verbose;

var pair = pairs.get(program.id);

if( !pair ){
    console.error('pair', program.id, 'does not exist.');
    process.exit(1);
}

if( verbose ){
    console.log("getting info for", pair.name, pair.country);
    console.log( "period: ", program.period, ", file: ", program.file );
}

// ================= main

getHtml( program.period, pair.id ).then(
    function( body ){
        // got a body, parse it to csv
        var csv = bodyToCSV( body );
        // write results to a file or to the console depending on the -f argument
        if( program.file ){
            writeToFile( program.file, csv );
        }else{
            console.log( csv );
        }

        var summary_csv = summaryDivToCSV( body );
        if( program.file ){
            writeToFile( program.file, summary_csv );
        }else{
            console.log( summary_csv );
        }
    },

    function( id, err, response ){
        // could not get data
        console.error( "An error occurred (id=" + id + "): ", err, ", ", response.statusCode );
    } );

// ================= functions

/**
 * Retrieve historical data from investing.com
 * @param start  the start date
 * @param stop   the end date
 * @param id     the id / type of commodity
 * @returns {Promise} resolve(body) or reject(err, httpResponse)
 */
function getHtml( period, id ){
    // form data
    var post_data = {
        pairID      : id,
        period      : period,
        viewType    : 'normal'
    };

    if( verbose ) console.log( "post data:", post_data );

    // specify headers
    var options = {
        url    : "https://uk.investing.com/instruments/Service/GetTechincalData",
        form   : post_data,
        headers: {
            'Origin'          : 'http://www.investing.com',
            'User-Agent'      : 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Ubuntu' +
            ' Chromium/51.0.2704.79 Chrome/51.0.2704.79 Safari/537.36',
            'X-Requested-With': 'XMLHttpRequest'
        }
    };

    return new Promise( function( resolve, reject ){
        // do the request
        request.post( options, function( err, httpResponse, body ){
            if( verbose ) console.log( id, ": ", httpResponse.statusCode, body.length );
            if( err || httpResponse.statusCode != 200 ) reject( id, err, httpResponse );
            else resolve( body );
        } );

    } );

}


/**
 * Parse the html body: extract data from the results table into a csv.
 * @param body  the html body
 * @returns {string} the csv, with headers
 */
function bodyToCSV( body ){
    var $ = cheerio.load( body );
    var csv = []; // an array of csv records
    var headers = [];

    // get the first table, which holds the interesting data
    var table = $('table.technicalIndicatorsTbl');

    // get headers
    table.find( 'th' ).each( function(){
        headers.push( $( this ).text() );
    } );
    csv.push( headers.join( ', ' ) );

    // get data
    table.find( 'tr' ).each( function(){
        var line = [];
        $( this ).children( 'td' ).each( function(){
            line.push( $( this ).text() );
        } );
        csv.push( line.join( ', ' ) );
    } );

    if( verbose )
        console.log( "Found " + (csv.length - 1) + " records." );

    return csv.join( "\n" );

}

function summaryDivToCSV( body ){
    var $ = cheerio.load( body );
    var csv = [];
    var headers = [];

    var div = $('div.instrumentTechTab');

    div.find('div.summary').each( function() {
        var line = [];
        line.push( $( this ).clone().find('span').remove().end().text() );
        line.push( $( this ).find('span').first().text() );
        csv.push( line.join( ', ' ) );
    } );

    div.find('div.summaryTableLine').each( function() {
        var line = [];
        $( this ).find('span').each( function() {
            line.push( $( this ).text() );
        } );
        csv.push( line.join( ', ' ) );
    } );

    if( verbose )
        console.log( "Found " + (csv.length - 1) + " records." );

    return csv.join( "\n" );
}

/**
 * Write a string to a file
 * @param file the filename
 * @param str the string to write
 */
function writeToFile( file, str ){
    fs.writeFile( file, str, function( err ){
        if( err ) return console.log( err );
        console.log( "File saved." );
    } )
}

