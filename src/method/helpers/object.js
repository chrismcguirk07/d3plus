//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Detects is we should set the object or check all keys of object.
//------------------------------------------------------------------------------
d3plus.method.object = function( vars , method , object , key , value ) {

  var acceptList   = key in object ? object[key].accepted : []

  if ( typeof acceptList === "function" ) {
    acceptList = acceptList( vars )
  }

  var matchingKey  = typeof value === "object" && value !== null
                     && d3.keys(value)[0] in object[key]
    , acceptAll    = acceptList === undefined && key in object
    , acceptString = acceptList && typeof acceptList[0] === "string"
                     && acceptList.indexOf(value) >= 0
    , acceptType   = acceptList && typeof acceptList[0] === "function"
                     && acceptList.indexOf(value.constructor) >= 0

  if ( ( acceptAll || acceptString || acceptType )
  && (!matchingKey || object[key].accessible === false)) {

    d3plus.method.set( vars , method , object , key , value )

  }
  else {

    for (d in value) {

      d3plus.method.object( vars , method , object[key] , d , value[d] )

    }

  }

}
