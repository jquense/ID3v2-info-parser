var _ = require('lodash')
  , binary = require('./lib/binaryHelpers')

var NOT_A_FRAME = 'Not an ID3 Tag frame'
  , NEED_MORE_DATA = 'insufficent data in stream'
  , headerSize = {
    2: 6,
    3: 10,
    4: 10
}

var encodings = [ 'iso-8859-1','utf16','utf16','utf8' ];

function Id3v2Frame( flags, version, whitelist ){
    var self = this;

    this.whitelist = whitelist || [];
    this.flags = flags;
    this.version = version;
}

Id3v2Frame.prototype.isValid = function() {
    if ( !this.header ) return true

    var id = this.header.id;

    return (id == null || id === '' || !(/[A-Z]/).test(id.charAt(0)) 
        ? false
        : true)
}


Id3v2Frame.prototype.parseHeader = function(buf) {
    var header
      , ver = this.version.minor;

    if ( buf === null) return;

    if ( ver === 2 ){
        header      = {};
        header.id   = buf.toString('ascii', 0, 3) 
        header.size = binary.readUInt24BE(buf, 3)
    } else {
        header       = {};
        header.id    = buf.toString('ascii', 0, 4);
        header.size  = ver === 3
            ? buf.readUInt32BE(4)
            : binary.syncSafe32Int(buf, 4);
        header.flags = getFrameFlags(this.version.minor, buf);
    }

    return this.header = header;
}

Id3v2Frame.prototype.getHeaderSize = function() {
    return headerSize[this.version.minor];
}

Id3v2Frame.prototype.getFrameDataSize = function() {
    return this.header.size || null
}

Id3v2Frame.prototype.parseFrameData = function(buf) {
    var ver    = this.version.minor
      , unsync = this.flags.unsync || (ver === 4 && this.header.flags.unsync );

    if ( buf === null ) return;

    if ( ver !== 2 ){
        if ( unsync ) buf = removeUnsyncBytes(buf);
        if ( this.header.flags.data_length ) buf = buf.slice(4);
    }

    return this._readData(buf);
}

Id3v2Frame.prototype._readData = function(buf) {
    var encoding = encodings[buf[0]]
      , delim    = getDelim(encoding)
      , len      = buf.length
      , off      = 1
      , type     = getType(this.header.id)
      , minor    = this.version.minor
      , tag      = {}
      , zero;

    if ( buf === null ) return;
    if ( this.whitelist.length && !_.contains(this.whitelist, type)) return {}

    if ( type === 'T*' ){
        tag = binary
            .decodeString(buf, encoding, off, len)
            .trim()
            .replace(/^\x00+/, '')
            .replace(/\x00+$/, '')
            .replace(/\x00/g,  '/');
    }

    else if( /(APIC|PIC)/.test(type) ){
        zero = binary.indexOf(buf, delim, off )

        if (zero === -1) return {};

        tag.mime = binary.decodeString(buf, encoding, off, zero);

        if ( minor === 2 && !~tag.mime.indexOf('image/') ) 
            tag.mime = 'image/' + binary.decodeString(buf, encoding, off += 4, off += 3);
        else
            off = zero;
    

        tag.type = PIC_TYPES[buf[off += 1 ]];

        zero = binary.indexOf(buf, delim, off)

        if (zero < off) 
            return {};

        tag.desc = binary.decodeString(buf, encoding, off, off = zero );

        tag.data = buf.slice(off + (buf[off + 1] === 0 ? 2 : 1));
    }

    else if( /(COM|COMM)/.test(type) ){
        tag.language = binary.decodeString(buf, encoding, off, off += 3);

        zero = binary.indexOf(buf, delim, off + 1) 

        if ( zero !== -1 )
            tag.desc = binary.decodeString(buf, encoding, off, off = zero );

        tag.text = binary.decodeString(buf, encoding, ++off);
    }

    return this.tag = tag
}


function getType(id){
    return id.charAt(0) === 'T' ? 'T*' : id;    
}

function getDelim(enc){
    return enc === 'utf16'
        ? new Buffer([0x00, 0x00])
        : new Buffer([0x00]);    
}

function removeUnsyncBytes(buffer) {
    var rIdx = 0
      , wIdx = 0;

    while (rIdx < buffer.length -1) {
        if (rIdx !== wIdx) buffer[wIdx] = buffer[rIdx];
    
        rIdx += (buffer[rIdx] === 0xFF && buffer[rIdx + 1] === 0) ? 2 : 1;
        wIdx++;
    }

    if (rIdx < buffer.length) buffer[wIdx++] = buffer[rIdx++];

    return buffer.slice(0, wIdx);
}


function getFrameFlags(ver, hdr){
    var ver3 = (ver === 3)
      , common = {
            tag_alter:  binary.getBit(hdr, 8, ver3 ? 7 : 6),
            file_alter: binary.getBit(hdr, 8, ver3 ? 6 : 5),
            read_only:  binary.getBit(hdr, 8, ver3 ? 5 : 4),

            compress:   binary.getBit(hdr, 9, ver3 ? 7 : 3),
            encrypt:    binary.getBit(hdr, 9, ver3 ? 6 : 2),
            grouping:   binary.getBit(hdr, 9, ver3 ? 5 : 6)
        }

    return ver3 ? common : _.extend(common,  {
        unsync:      binary.getBit(hdr, 9, 1),
        data_length: binary.getBit(hdr, 9, 0)
    })
}

module.exports = Id3v2Frame;

var PIC_TYPES = [
    'Other',
    'pixels "file icon" (PNG only)',
    'Other file icon',
    'Cover (front)',
    'Cover (back)',
    'Leaflet page',
    'Media (e.g. lable side of CD)',
    'Lead artist/lead performer/soloist',
    'Artist/performer',
    'Conductor',
    'Band/Orchestra',
    'Composer',
    'Lyricist/text writer',
    'Recording Location',
    'During recording',
    'During performance',
    'Movie/video screen capture',
    'A bright coloured fish',
    'Illustration',
    'Band/artist logotype',
    'Publisher/Studio logotype']