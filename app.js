console.clear();

// How many copies of the path to make (more = smoother gradient, but more clones of the path)
var resolution = 14;

// Using Array.from to...
var gradientPaths = Array.from(
  
  // ...find all .gradient-path elements...
  document.querySelectorAll('.gradient-path'),
  
  // ...and run this function over them:
  function(path){

    // Get the length of the path
    var length = path.getTotalLength();
    
    // How big each segment of the gradient should be
    var segmentLength = ( length / resolution );

    // Create a group for all of the new paths to reside in
    var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    path.parentNode.insertBefore(g, path.nextSibling);
    
    // Apply some styles for all the cloned paths on the <g> to be inherited
    g.style.strokeDasharray =  segmentLength + ' ' + ( length - segmentLength );

    for (var i = 0; i < resolution; i++) {
      // Clone the path
      var c = path.cloneNode();
      
      // Give it a nice color spanning the entire spectrum
      c.style.stroke = 'hsl(' + (i / resolution) * 360 + ', 75%, 60%)';
      
      // How much the stroke-dash should be offset (`stroke-dashoffset`)
      var offset = length * ( i / resolution );
      c.style.strokeDashoffset = offset;
      
      // Pass along the necessary offset for the CSS animation as a CSS var
      c.style.setProperty('--total-offset', (length + offset) );
      
      // Add the cloned path to the group
      g.appendChild(c);
    }

    return path;

  });
