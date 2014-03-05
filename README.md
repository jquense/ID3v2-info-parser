ID3 Version 2 Audio Metadata parser
=====================================

A simple streaming parser for retrieving ID3 metadata from an mp3 file

### Install

    npm install id3v2-parser


### Use
The parser is simply a stream in objectMode, so you can pipe and binary data into it and it will spit out tag objects

    var ID3 = require('id3v2-parser')
      , stream = require('fs').createReadStream('./my-audio.mp3')

    var parser = stream.pipe(new ID3());

    parser.on('data', function(tag){
        console.log(tag.type)  // => 'TPE1'
        console.log(tag.value) // => 'Bastille'
    })


 use in conjunction with my ID3v1 parser and [mpeg frame parser](https://github.com/theporchrat/mpeg-frame-parser/) for more data.
