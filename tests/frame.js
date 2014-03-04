var chai = require('chai')
  , readStream = require('fs' ).createReadStream
  , Parser = require('../id3v2Parser');

chai.should();

describe ('when streaming an mpeg file to the tag parser', function(){
    var parser;

    beforeEach(function(){
        parser = new Parser();
    })

    it.only('should correctly parse tags', function(done){
        var tags = {}
        readStream(__dirname + '/ID3Tags.mp3')
            .pipe(parser)
            .on('data', function(tag){
                tag.should.not.be.undefined;

                if ( tag.type === 'COMM'){
                    if ( !tags[tag.type]) tags[tag.type] = []
                    tags[tag.type].push(tag.value)
                } else
                    tags[tag.type] = tag.value
            })
            .on('end', function(){
                tags.TPE1.should.equal('jimmy')
                tags.TIT3.should.equal('subtitle')
                tags.TCON.should.equal('Classic Rock')
                tags.TDOR.should.equal('2014-03-03T14:44:45')
                tags.TALB.should.equal('No Album')
                tags.should.have.deep.property('COMM[1].desc' ).that.equals('url')
                tags.should.have.deep.property('COMM[1].text' ).that.equals('From http://www.xamuel.com/blank-mp3s/')
                tags.should.not.have.deep.property('COMM[0].desc' )
                done()
            })
    })

    it('should correctly parse picture in the correct format', function(done){
        var tags = {}, foundPic
        readStream(__dirname + '/ID3Tags.mp3')
            .pipe(parser)
            .on('data', function(tag){

                if ( tag.type === 'APIC') {
                    foundPic = true
                    tag.value.should.have.property('type' ).that.equals('Cover (front)')
                    tag.value.should.have.property('mime' ).that.equals('image/png')
                    tag.value.should.have.property('data' ).that.is.instanceOf(Buffer)
                }
            })
            .on('end', function(){
                foundPic.should.equal(true)
                done()
            })
    })
})
