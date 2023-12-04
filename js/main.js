var graphmap, svg;

var mapdata = {
    allnodes: [],
    paths: [],
    distances: [],
    getui: {
        htmlSelectStartingNode: "#from-starting",
        htmlSelectEndNode: "#to-end"
    },
    getstate: {
        selectedNode: null,
        fromNode: null,
        toNode: null
    }
};

// $('#exampleModal').on('show.bs.modal', function (event) {
//     var button = $(event.relatedTarget);
//     var recipient = button.data('whatever');
//     var modal = $(this);
//     modal.find('.modal-title').text('New message to ' + recipient);
//     modal.find('.modal-body input').val("");

// });







$(function () {

    graphmap = d3.select('#svg-map');

    svg = graphmap.append("svg:svg")
        .attr("id", "svg")
        .attr("class", "svgmap")
        .attr("width", 1110)
        .attr("height", 800)
        .on("click", addNode)
        .on("contextmenu", function () { d3.event.preventDefault(); });




});

var dragManager = d3.behavior.drag()
    .on('dragstart', dragNodeStart())
    .on('drag', dragNode())
    .on('dragend', dragNodeEnd());



$("#data-export").click(function (e) {

    e.stopPropagation();

    var exportData = JSON.stringify({
        nodes: mapdata.allnodes,
        paths: mapdata.paths
    });

    var target = $(this);

    var link = $("<a></a>")
        .addClass("exportLink")
        .click(function (e) { e.stopPropagation(); })
        .attr('target', '_self')
        .attr("download", "nodesandpaths.json")
        .attr("href", "data:application/json," + exportData);

    link.appendTo(target).get(0).click();

    $(".exportLink").remove();

});







$("#data-import").change(function (e) {
    e.stopPropagation();
    var files = e.target.files;
    var file = files[0];
    if (file === undefined) return;
    var reader = new FileReader();
    reader.onload = function () {
        try {
            var importedData = JSON.parse(this.result);
        }
        catch (exception) {
            console.log("** Error importing JSON: %s", exception);
            return;
        }
        if (importedData.nodes === undefined
            || importedData.paths === undefined
            || Object.keys(importedData).length !== 2) {
            console.log("** JSON format error:");
            console.log(importedData);
            return;
        }


        mapdata.allnodes = importedData.nodes;
        mapdata.paths = importedData.paths;
        mapdata.distances = [];
        mapdata.getstate.selectedNode = null;
        mapdata.getstate.fromNode = null;
        mapdata.getstate.toNode = null;

        mapdata.allnodes.forEach(function (node) {
            addNodeToSelect(node.name);
        });

        calculateDistancesbetweennodes();
        redrawLines();
        redrawNodes();
    };
    reader.readAsText(file);
});

$('#test').on('click', function () {

    calculateDistancesbetweennodes();
    redrawLines();
    pathDatum = {
        id: 0,
        from: mapdata.allnodes[0].name,
        to: mapdata.allnodes[1].name

    };

    mapdata.paths.push(pathDatum);
    calculateDistancesbetweennodes();
    redrawLines();

});


$('#intersect').on('click', function () {
    const intersectElements = document.querySelector("#intersectcard.card-body");
    calculateDistancesbetweennodes();
    if (mapdata.paths.length > 2 || mapdata.paths.length == 0) {

        $('#errorModal').modal('show');
        clearGraph();
    }
    line1Start = mapdata.allnodes[mapdata.paths[0].from];
    line1End = mapdata.allnodes[mapdata.paths[0].to];
    line2Start = mapdata.allnodes[mapdata.paths[1].from];
    line2End = mapdata.allnodes[mapdata.paths[1].to];
    console.log(line1Start, line1End, line2Start, line2End);

    const orientation1 = arePointsCounterClockwise(line1Start, line1End, line2Start) > 0;
    const orientation2 = arePointsCounterClockwise(line1Start, line1End, line2End) > 0;
    const orientation3 = arePointsCounterClockwise(line2Start, line2End, line1Start) > 0;
    const orientation4 = arePointsCounterClockwise(line2Start, line2End, line1End) > 0;

    // If the orientations for one line are different, it implies intersection.
    if ((orientation1 !== orientation2) && (orientation3 !== orientation4)) {
        intersectElements.textContent = "Yes!";
    }
    else {
        intersectElements.textContent = "no :(";

    }


});


$('#intersecttwo').on('click', function () {
    const intersectElement2 = document.querySelector("#intersectcardtwo.card-body");
    intersectElement2.textContent = null;
    calculateDistancesbetweennodes();
    if (mapdata.paths.length > 2 || mapdata.paths.length == 0) {
        $('#errorModal').modal('show');
        clearGraph();
    }
    line1Start = mapdata.allnodes[mapdata.paths[0].from];
    line1End = mapdata.allnodes[mapdata.paths[0].to];
    line2Start = mapdata.allnodes[mapdata.paths[1].from];
    line2End = mapdata.allnodes[mapdata.paths[1].to];
    console.log(line1Start, line1End, line2Start, line2End);
    const x1 = line1Start.x;
    const y1 = line1Start.y;
    const x2 = line1End.x;
    const y2 = line1End.y;
    const x3 = line2Start.x;
    const y3 = line2Start.y;
    const x4 = line2End.x;
    const y4 = line2End.y;

    const denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

    if (denominator === 0) {
        intersectElement2.textContent = "Lines parallel or coincedent";
    }

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denominator;
    const s = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denominator;

    // Check if the intersection point lies within both line segments.
    if (t >= 0 && t <= 1 && s >= 0 && s <= 1) {
        console.log("yes");
        intersectElement2.textContent = "Yes!";
    }
    else {
        console.log("no");
        intersectElement2.textContent = "no :(";
    }


});


$('#intersectthree').on('click', function () {
    const intersectElement3 = document.querySelector("#intersectcardthree.card-body");
    intersectElement3.textContent = "undecided";

    var line1Start, line2Start, line1End, line2End = null;

    line1Start = mapdata.allnodes[mapdata.paths[0].from];
    line1End = mapdata.allnodes[mapdata.paths[0].to];
    line2Start = mapdata.allnodes[mapdata.paths[1].from];
    line2End = mapdata.allnodes[mapdata.paths[1].to];

    const box1 = createBoundingBox(line1Start, line1End);
    const box2 = createBoundingBox(line2Start, line2End);


    if (box1.minX <= box2.maxX &&
        box1.maxX >= box2.minX &&
        box1.minY <= box2.maxY &&
        box1.maxY >= box2.minY) {

        intersectElement3.textContent = "Yes!";
    }
    else {
        intersectElement3.textContent = "no";
    }


    function createBoundingBox(point1, point2) {
        const minX = Math.min(point1.x, point2.x);
        const minY = Math.min(point1.y, point2.y);
        const maxX = Math.max(point1.x, point2.x);
        const maxY = Math.max(point1.y, point2.y);

        return { minX, minY, maxX, maxY };
    }

});




$('#bruteforce').on('click', function () {

    const bftime = document.querySelector("#timethree.time");
    const codeString = `
for (let i = 0; i < N; i++) { ---> O(n)
    for (let j = 0; j < N; j++) { --->O(n^2)
        ccwflag = false;
        cwflag = false;
        for (let k = 0; k < N; k++) { ---> O(n^3)
            var t = arePointsCounterClockwise(p1, p2, p3);
            if (t > 0) {
                ccwflag = true;
            }
            if (t < 0) {
                cwflag = true;
            }
        }
        isconvex = ccwflag && cwflag;   
        if (isconvex == false) {
            p1 and p2 belong on the hull
        }
    }
} 
The space complexity of the Brute Force Convex Hull algorithm is generally considered to be O(1),
 which means it is constant and does not depend on the input size (number of points).
This is because the algorithm typically performs its computations in-place
without requiring additional data structures that grow with the input size.

The time complexity is O(n^3) as shown by the 3 for loops going from the beginning to end of the input size.
`;

    const htmlContent = `
<h1>Time Complexity: O(n^3) Space Complexity: O(1)</h1>
<p1><pre style="font-family: Consolas, 'courier new'; color: crimson; background-color: #f1f1f1; padding: 2px; font-size: 105%;"><code>${codeString}</code></pre></p1>
`;
    $('#timeandspace').html(htmlContent);
    bftime.textContent = "0:00:00";
    mapdata.paths.length = 0;
    calculateDistancesbetweennodes();
    redrawLines();
    redrawNodes();
    var pathvar = 0;
    var ccwflag = false, cwflag = true, kflag = false;
    var isconvex = false;
    if (mapdata.allnodes.length < 3) {
        $('#errorModal').modal('show');
        clearGraph();
    }
    let starttime = performance.now();
    for (let i = 0; i < mapdata.allnodes.length; i++) {
        for (let j = 0; j < mapdata.allnodes.length; j++) {
            ccwflag = false;
            cwflag = false;
            for (let k = 0; k < mapdata.allnodes.length; k++) {
                p1 = mapdata.allnodes[i];
                p2 = mapdata.allnodes[j];
                p3 = mapdata.allnodes[k];
                var t = arePointsCounterClockwise(p1, p2, p3);
                if (t > 0) {
                    ccwflag = true;
                }
                if (t < 0) {
                    cwflag = true;
                }
            }
            isconvex = ccwflag && cwflag;
            if (p1.name != p2.name) {
                if (isconvex == false) {
                    var pathDatum = {
                        id: pathvar++,
                        from: p1.name,
                        to: p2.name
                    };
                    mapdata.paths.push(pathDatum);
                    calculateDistancesbetweennodes();
                    redrawLines();
                    changecolor(p1.name);
                    changecolor(p2.name);
                    console.log("sent", p1.name, p2.name);
                    // redrawNodes();
                }
            }
        }
    }
    bftime.textContent = ((performance.now() - starttime)).toFixed(3) + "ms";
    console.log(mapdata);



});



$('#jarvis').on('click', function () {
    var jarvistime = document.querySelector('#timefour.time');
    jarvistime.textContent = "0:00:00";
    const codeString = `

            O(N):
    for (let i = 1; i < N; i++) { --> O(N)
        const point = map[i];
        if (point.y < startPoint.y) {
            startPoint = point;  // find minY
        }
    convexHull.push(startPoint);
    var currentPoint = startPoint;  


            O(N*H):
    do {
        let nextPoint = map[0];
        for (let i = 1; i < N; i++) { --> O(N)
            if (nextPoint === currentPoint || CCW(currentPoint, nextPoint, map[i]) > 0) {
                nextPoint = map[i];
            }
        }
        currentPoint = nextPoint;
        convexHull.push(currentPoint);
    } while (currentPoint !== startPoint); -->O(H * N) 

    
    The Jarvis March algorithm operates in-place, 
    without requiring additional data structures that grow with the input size, thus space complexity O(1)
    The time complexity is O(NH) 
    where H is the number of points on the hull.
    `;
    const htmlContent = `
    <h1>Time Complexity: O(nH) Space Complexity: O(1)</h1>
    <p1><pre style="font-family: Consolas, 'courier new'; color: black; background-color: #f1f1f1; padding: 2px; font-size: 105%;"><code>${codeString}</code></pre></p1>
    `;
    $('#timeandspace').html(htmlContent);
    mapdata.paths.length = 0;
    calculateDistancesbetweennodes();
    redrawLines();
    redrawNodes();

    if (mapdata.allnodes.length < 3) {
        $('#errorModal').modal('show');
        clearGraph();
    }
    let starttime = performance.now();
    console.log(starttime);
    var startPoint = mapdata.allnodes[0];
    let convexHull = [];
    var pathvar = 0;
    for (let i = 1; i < mapdata.allnodes.length; i++) {
        const point = mapdata.allnodes[i];
        if (point.y < startPoint.y || (point.y === startPoint.y && point.x < startPoint.x)) {
            startPoint = point;
        }
    }
    convexHull.push(startPoint);
    var currentPoint = startPoint;

    do {
        let nextPoint = mapdata.allnodes[0];
        for (let i = 1; i < mapdata.allnodes.length; i++) {
            // console.log(arePointsCounterClockwise(currentPoint, nextPoint, mapdata.allnodes[i]), currentPoint, nextPoint, mapdata.allnodes[i]);

            if (nextPoint === currentPoint || arePointsCounterClockwise(currentPoint, nextPoint, mapdata.allnodes[i]) > 0) {
                // console.log(arePointsCounterClockwise(currentPoint, nextPoint, mapdata.allnodes[i]), "ccw", currentPoint, nextPoint, mapdata.allnodes[i]);
                nextPoint = mapdata.allnodes[i];
            }
        }
        currentPoint = nextPoint;
        convexHull.push(currentPoint);
    } while (currentPoint !== startPoint);
    var endtime = performance.now() - starttime;
    console.log(endtime);
    jarvistime.textContent = endtime.toFixed(4) + "ms";
    var pathDatum;
    changecolor(convexHull[0].name);
    for (let i = 0; i < convexHull.length - 1; i++) {
        pathDatum = {
            id: pathvar,
            from: convexHull[i].name,
            to: convexHull[i + 1].name,
        };
        mapdata.paths.push(pathDatum);
        calculateDistancesbetweennodes();
        changecolor(convexHull[i + 1].name);
        redrawLines();
        pathvar++;
    }
    // console.log(convexHull);
});


$('#graham').on('click', function () {
    let gstime = document.querySelector('#timefive.time');
    gstime.textContent = "0:00:00";

    const codeString = `
    var lowestPoint = map[0];
            O(N):
    for (let i = 1; i < map.length; i++) { -->O(N)
        const point = map[i];
        if (point.y < lowestPoint.y)) {
            lowestPoint = point; //find minY
        }
    }
            O(NlogN):
    const sorted = map.slice().sort((p, q) => { -->O(nlogn) for sorting
        const orientationValue = arePointsCounterClockwise(lowestPoint, p, q);
        if (orientationValue === 0) {
            const distanceP = (p.x - lowestPoint.x) ** 2 + (p.y - lowestPoint.y) ** 2;
            const distanceQ = (q.x - lowestPoint.x) ** 2 + (q.y - lowestPoint.y) ** 2;
            return distanceP - distanceQ;
        }
        return (orientationValue > 0) ? -1 : 1;
    });

            O(N):
    const stack = [];
    stack.push(sorted[0],sorted[1], sorted[2]);
    for (let i = 3; i < sorted.length; i++) { --> O(N)
        while (stack.length > 2 && CCW(stack[stack.length - 2], stack[stack.length - 1], sorted[i]) <= 0) {
            stack.pop();
        }
        stack.push(sorted[i]);
    }


    The time complexity is O(N logN) due to sorting. Other loops are all O(N).
    The space complexity is O(N) as an additional data structure, such as a stack is used, which grows with the input size. 
    The size of the stack is proportional to the number of vertices on the convex hull, which is at most N. 
    Stack : O(H). Worst Case : O(N)
    `;
    const htmlContent = `
    <h1>Time Complexity: O(N logN) Space Complexity: O(N)</h1>
    <p1><pre style="font-family: Consolas, 'courier new'; color: black; background-color: #f1f1f1; padding: 2px; font-size: 105%;"><code>${codeString}</code></pre></p1>
    `;
    $('#timeandspace').html(htmlContent);
    var pathvar = 0;
    mapdata.paths.length = 0;
    calculateDistancesbetweennodes();
    redrawLines();
    redrawNodes();
    if (mapdata.allnodes.length < 3) {
        $('#errorModal').modal('show');
        clearGraph();
    }
    let starttime = performance.now();
    var lowestPoint = mapdata.allnodes[0];
    for (let i = 1; i < mapdata.allnodes.length; i++) {
        const point = mapdata.allnodes[i];
        if (point.y < lowestPoint.y || (point.y === lowestPoint.y && point.x < lowestPoint.x)) {
            lowestPoint = point;
        }
    }

    const sortedPoints = mapdata.allnodes.slice().sort((p, q) => {
        // console.log(lowestPoint, p, q, "lp, p and q");
        const orientationValue = arePointsCounterClockwise(lowestPoint, p, q);
        // orientationValue > 0 ? console.log("ccw") : console.log("cw");
        if (orientationValue === 0) {
            // If points are collinear, prioritize the closest point first
            const distanceP = (p.x - lowestPoint.x) ** 2 + (p.y - lowestPoint.y) ** 2;
            const distanceQ = (q.x - lowestPoint.x) ** 2 + (q.y - lowestPoint.y) ** 2;
            return distanceP - distanceQ;
        }
        return (orientationValue > 0) ? -1 : 1;
    });
    // console.log(sortedPoints, "sp");
    const stack = [];
    stack.push(sortedPoints[0]);
    stack.push(sortedPoints[1]);
    stack.push(sortedPoints[2]);
    for (let i = 3; i < sortedPoints.length; i++) {
        while (stack.length > 2 && arePointsCounterClockwise(stack[stack.length - 2], stack[stack.length - 1], sortedPoints[i]) <= 0) {
            stack.pop();
        }
        stack.push(sortedPoints[i]);
    }

    let endtime = performance.now() - starttime;
    gstime.textContent = endtime.toFixed(7) + "ms";
    for (let i = 0; i < stack.length; i++) {
        pathDatum = {
            id: pathvar,
            from: stack[i].name,
            to: stack[(i + 1) % stack.length].name,

        };
        mapdata.paths.push(pathDatum);
        calculateDistancesbetweennodes();
        changecolor(stack[i].name);
        redrawLines();

        // redrawNodes();
        pathvar++;
    }

    console.log(endtime);
    // console.log(stack, "final");

});


$('#quick').on('click', function () {
    var quicktime = document.querySelector("#timesix.time");
    const codeString = `
            O(N):
    for (let i = 1; i < map.length; i++) {
        const point = map[i];
        if (point.y <= lowestyPoint.y) {
            lowestyPoint = point;
        }
        if (point.x <= lowestxPoint.x ) {
            lowestxPoint = point;
        }
        if (point.y >= highestyPoint.y ) {
            highestyPoint = point;
        }
        if (point.x >= highestxPoint.x) {
            highestxPoint = point;
        }
    }

    stack.push(extremepoints);

            O(N):
    var rpoints = [];
    for (let i = 0; i < map.length; i++) {
        if (stack.includes(map[i])) {
            rpoints.push(map[i]);
            continue;
        }
        if (!(isInsideQuadrilateral(map[i], stack))) {
            // console.log(map[i], "is NOT Inside quadrilateral point of q:", stack);
            rpoints.push(map[i]);
        }
    }


    //graham scan
            O(NlogN) sorting, defaults to O(N):
    rpoints.sort((p, q) => {
        // console.log(lowestyPoint, p, q, "lp, p and q");
        const orientationValue = arePointsCounterClockwise(lowestyPoint, p, q);
        // orientationValue > 0 ? console.log("ccw") : console.log("cw");
        if (orientationValue === 0) {
            // If points are collinear, prioritize the closest point first
            const distanceP = (p.x - lowestyPoint.x) ** 2 + (p.y - lowestyPoint.y) ** 2;
            const distanceQ = (q.x - lowestyPoint.x) ** 2 + (q.y - lowestyPoint.y) ** 2;
            return distanceP - distanceQ;
        }
        return (orientationValue > 0) ? -1 : 1;
    });
    var stack2 = [];
    stack2.push(rpoints[0],rpoints[1],rpoints[2]);

             O(N):
    for (let i = 3; i < rpoints.length; i++) {
        while (stack2.length > 2 && CCW(stack2[stack2.length - 2], stack2[stack2.length - 1], rpoints[i]) <= 0) {
            stack2.pop();
        }
        stack2.push(rpoints[i]);
    }

    Assuming reasonable point distribution, the time complexity of Quick Elim can become O(N).
    If the quadrilateral contains many points, the sorting of GrahamScan takes O(N) rather than O(NlogN)
    due to so many points being elimniated from computations.
    All other functions were already O(N), thus final complexity is O(N).

    The space complexity is O(N) as we need 2 additional data structures.
    A stack to store the points that make up the quadrilateral (O(H)) Worst case: O(N)
    An array to store the points being considered that are NOT inside the quadrilateral. (O(N))
    A Graham Scan is performed on that array for the final convex hull, thus final space complexity is O(N)
    `;
    const htmlContent = `
    <h1>Time Complexity: O(N) Space Complexity: O(N)</h1>
    <p1><pre style="font-family: Consolas, 'courier new'; color: black; background-color: #f1f1f1; padding: 2px; font-size: 105%;"><code>${codeString}</code></pre></p1>
    `;
    $('#timeandspace').html(htmlContent);
    mapdata.paths.length = 0;
    quicktime.textContent = "0:00:00";
    calculateDistancesbetweennodes();
    redrawLines();
    redrawNodes();
    var pathvar = 0;
    if (mapdata.allnodes.length < 4) {
        $('#errorModal').modal('show');
        clearGraph();
    }
    let quicktimestart = performance.now();
    var stack = [];
    var lowestyPoint = mapdata.allnodes[0];
    var lowestxPoint = mapdata.allnodes[0];
    var highestyPoint = mapdata.allnodes[0];
    var highestxPoint = mapdata.allnodes[0];
    for (let i = 1; i < mapdata.allnodes.length; i++) {
        const point = mapdata.allnodes[i];
        if (point.y <= lowestyPoint.y && point.y != lowestyPoint.y && point.y != highestyPoint.y && point.y != highestxPoint.y) {
            lowestyPoint = point;
        }
        if (point.x <= lowestxPoint.x && point.x != lowestyPoint.x && point.x != highestyPoint.x && point.x != highestxPoint.x) {
            lowestxPoint = point;
        }
        if (point.y >= highestyPoint.y && point.y != lowestyPoint.y && point.y != highestyPoint.y && point.y != highestxPoint.y) {
            highestyPoint = point;
        }
        if (point.x >= highestxPoint.x && point.x != lowestyPoint.x && point.x != highestyPoint.x && point.x != highestxPoint.x) {
            highestxPoint = point;
        }
    }
    stack.push(lowestxPoint, lowestyPoint, highestxPoint, highestyPoint);
    // console.log(lowestyPoint, "lowesty", lowestxPoint, "lowestx");
    // console.log(highestyPoint, "highesty", highestxPoint, "highestx");
    var pointstobeconsidered = [];
    for (let i = 0; i < mapdata.allnodes.length; i++) {
        if (stack.includes(mapdata.allnodes[i])) {
            pointstobeconsidered.push(mapdata.allnodes[i]);
            continue;
        }
        if (!(isInsideQuadrilateral(mapdata.allnodes[i], stack))) {
            // console.log(mapdata.allnodes[i], "is NOT Inside quadrilateral point of q:", stack);
            pointstobeconsidered.push(mapdata.allnodes[i]);
        }
    }


    // console.log(pointstobeconsidered, "remainingpoints");
    //graham scan
    pointstobeconsidered.sort((p, q) => {
        // console.log(lowestyPoint, p, q, "lp, p and q");
        const orientationValue = arePointsCounterClockwise(lowestyPoint, p, q);
        // orientationValue > 0 ? console.log("ccw") : console.log("cw");
        if (orientationValue === 0) {
            // If points are collinear, prioritize the closest point first
            const distanceP = (p.x - lowestyPoint.x) ** 2 + (p.y - lowestyPoint.y) ** 2;
            const distanceQ = (q.x - lowestyPoint.x) ** 2 + (q.y - lowestyPoint.y) ** 2;
            return distanceP - distanceQ;
        }
        return (orientationValue > 0) ? -1 : 1;
    });
    var stack2 = [];
    stack2.push(pointstobeconsidered[0]);
    stack2.push(pointstobeconsidered[1]);
    stack2.push(pointstobeconsidered[2]);


    for (let i = 3; i < pointstobeconsidered.length; i++) {
        while (stack2.length > 2 && arePointsCounterClockwise(stack2[stack2.length - 2], stack2[stack2.length - 1], pointstobeconsidered[i]) <= 0) {
            stack2.pop();
        }
        stack2.push(pointstobeconsidered[i]);
    }

    let endquicktime = performance.now() - quicktimestart;

    quicktime.textContent = endquicktime.toFixed(4) + "ms";

    for (let i = 0; i < stack.length; i++) {
        pathDatum = {
            id: pathvar,
            from: stack[i].name,
            to: stack[(i + 1) % stack.length].name,

        };
        mapdata.paths.push(pathDatum);
        calculateDistancesbetweennodes();
        redrawLines();
        redrawNodes();
        pathvar++;
    }
    for (let i = 0; i < stack2.length; i++) {
        pathDatum = {
            id: pathvar,
            from: stack2[i].name,
            to: stack2[(i + 1) % stack2.length].name,
        };
        mapdata.paths.push(pathDatum);
        calculateDistancesbetweennodes();
        changecolor(stack2[i].name);

        redrawLines();

        // redrawNodes();
        pathvar++;
    }
    // console.log(stack2, "final");




});



$('#monotone').on('click', function () {

    var monotime = document.querySelector("#timeseven.time");
    mapdata.paths.length = 0;
    const codeString = `

                O(NlogN): //due to sorting
    let ans = new Array(2 * map.length);
    const sorted = map.slice().sort((a, b) => {
        return a.x - b.x || a.y - b.y;;
    });


                O(N):
    for (let i = 0; i < sorted.length; ++i) {
        while (k >= 2 && CCW(ans[k - 2], ans[k - 1], sorted[i]) <= 0) {
            k--;
        }
        ans[k++] = sorted[i];
    }

    for (let i = sorted.length - 1, t = k + 1; i > 0; --i) {
        while (k >= t && CCW(ans[k - 2], ans[k - 1], sorted[i - 1]) <= 0) {
            k--;
        }
        ans[k++] = sorted[i - 1];
    }
    ans.length = k - 1;

    The time complexity is O(NlogN) owing to the sorting step. The following computations all take O(N) time.

    The space complexity is O(N) as additional data structures are used, which grow with the input size.
    An array to store the sorted points : O(N)
    A stack used to store the final convex hull : O(h). Worst case : O(N)
    Thus final space complexity : O(N)
    `;
    const htmlContent = `
    <h1>Time Complexity: O(N logN) Space Complexity: O(N)</h1>
    <p1><pre style="font-family: Consolas, 'courier new'; color: black; background-color: #f1f1f1; padding: 2px; font-size: 105%;"><code>${codeString}</code></pre></p1>
    `;
    $('#timeandspace').html(htmlContent);
    monotime.textContent = "0:00:00";
    calculateDistancesbetweennodes();
    redrawLines();
    redrawNodes();
    if (mapdata.allnodes.length < 3) {
        $('#errorModal').modal('show');
        clearGraph();
    }
    let monostarttime = performance.now();
    let ans = new Array(2 * mapdata.allnodes.length);
    var k = 0;
    var pathvar = 0;
    const sorted = mapdata.allnodes.slice().sort((a, b) => {
        return a.x - b.x || a.y - b.y;;
    });

    for (let i = 0; i < sorted.length; ++i) {
        while (k >= 2 && arePointsCounterClockwise(ans[k - 2], ans[k - 1], sorted[i]) <= 0) {
            k--;
        }
        ans[k++] = sorted[i];
    }

    for (let i = sorted.length - 1, t = k + 1; i > 0; --i) {
        while (k >= t && arePointsCounterClockwise(ans[k - 2], ans[k - 1], sorted[i - 1]) <= 0) {
            k--;
        }
        ans[k++] = sorted[i - 1];
    }


    ans.length = k - 1;

    let monoendtime = performance.now() - monostarttime;

    monotime.textContent = monoendtime.toFixed(4) + "ms";

    for (let i = 0; i < ans.length; i++) {
        pathDatum = {
            id: pathvar,
            from: ans[i].name,
            to: ans[(i + 1) % ans.length].name,

        };
        mapdata.paths.push(pathDatum);
        calculateDistancesbetweennodes();
        changecolor(ans[i].name);

        redrawLines();
        // redrawNodes();
        pathvar++;
    }

    console.log(ans);
});

function isInsideQuadrilateral(point, quadPoints) {
    const n = quadPoints.length;
    let isInside = true;

    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const orientation = arePointsCounterClockwise(quadPoints[i], quadPoints[j], point);

        if (orientation === 0) {
            isInside = onEdge(quadPoints[i], quadPoints[j], point);
            if (!isInside) break;
        } else if (orientation < 0) {
            isInside = false;
            break;
        }
    }
    return isInside;

    function onEdge(p, q, r) {
        return r.x <= Math.max(p.x, q.x) && r.x >= Math.min(p.x, q.x) &&
            r.y <= Math.max(p.y, q.y) && r.y >= Math.min(p.y, q.y);
    }
}





function calculateDistance(p, q) {
    const deltaX = q.x - p.x;
    const deltaY = q.y - p.y;
    return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
}
$('#clearmap').on('click', function () {
    clearGraph();

});







function addNode() {
    if (d3.event.defaultPrevented) return;
    var position = d3.mouse(this);
    var nodeName = mapdata.allnodes.length;
    mapdata.allnodes.push({
        name: nodeName, x: parseInt(position[0]), y: parseInt(position[1])
    });
    redrawNodes();
    addNodeToSelect(nodeName);

};



function addNodeToSelect(nodeName) {
    $(mapdata.getui.htmlSelectStartingNode).append($("<option></option>").attr("value", nodeName).text(nodeName));
    $(mapdata.getui.htmlSelectEndNode).append($("<option></option>").attr("value", nodeName).text(nodeName));
};

function clearGraph() {
    bftimeElement = document.querySelector("#timethree.time");
    jmtimeElement = document.querySelector("#timefour.time");
    gstimeElement = document.querySelector("#timefive.time");
    intersect1 = document.querySelector("#intersectcard.card-body");
    intersect2 = document.querySelector("#intersectcardtwo.card-body");

    bftimeElement.textContent = "0:00:00";
    jmtimeElement.textContent = "0:00:00";
    gstimeElement.textContent = "0:00:00";
    intersect1.textContent = null;
    intersect2.textContent = null;


    mapdata.allnodes = [];
    mapdata.paths = [];
    $(mapdata.getui.htmlSelectStartingNode).empty();
    $(mapdata.getui.htmlSelectEndNode).empty();
    $("#results").empty();
    $('#svg-map').css({
        'background-image': 'url(' + null + ')'

    });
    redrawNodes();
    redrawLines();

};





function changecolor(nodeName) {
    console.log("got", nodeName);

    var elements2 = svg.selectAll("g.nodes")
        .filter(function (d) {
            return d.name == nodeName; // Filter to select only the node with the specified name
        })
        .data(mapdata.allnodes, function (d) {
            return d.name; // Use the name as the key function for data binding
        });
    elements2.select("circle")
        .transition()
        .duration(30)
        .delay(function (d, i) { return i * 5; })
        .style('fill', 'green');

}
function redrawNodes() {

    svg.selectAll("g.nodes").data([]).exit().remove();

    var elements = svg.selectAll("g.nodes").data(mapdata.allnodes, function (d, i) { return d.name; });

    var nodesEnter = elements.enter().append("g")
        .attr("class", "nodes");

    elements.attr("transform", function (d, i) {
        return "translate(" + d.x + "," + d.y + ")";
    });

    nodesEnter.append("circle")
        .attr("nodeId", function (d, i) { return i; })
        .attr("r", '15')
        .attr("class", "node")
        .style("cursor", "pointer")
        .on('click', nodeClick)
        .on('contextmenu', function (d, i) { startEndPath(i); })
        .call(dragManager);


    nodesEnter
        .append("text")
        .attr("nodeLabelId", function (d, i) { return i; })
        .attr("dx", "-5")
        .attr("dy", "5")
        .attr("class", "label")
        .on('contextmenu', function (d, i) { startEndPath(i); })
        .call(dragManager)
        .text(function (d, i) { return d.name; });
    elements.exit().remove();


};

function redrawLines() {

    svg.selectAll("g.line").data([]).exit().remove();

    var elements = svg
        .selectAll("g.line")
        .data(mapdata.paths, function (d) { return d.id; });

    var newElements = elements.enter();


    var group = newElements
        .append("g")
        .attr("class", "line");

    var line = group.append("line")
        .attr("class", function (d) { return "from" + mapdata.allnodes[d.from].name + "to" + mapdata.allnodes[d.to].name; })
        .attr("x1", function (d) { return mapdata.allnodes[d.from].x; })
        .attr("y1", function (d) { return mapdata.allnodes[d.from].y; })
        .attr("x2", function (d) { return mapdata.allnodes[d.to].x; })
        .attr("y2", function (d) { return mapdata.allnodes[d.to].y; })
        .style("opacity", 0);


    console.log(mapdata.distances);
    // Add transitions
    line.transition()
        .duration(100) // Set the duration for the transition\
        .delay(function (d, i) { return i * 100; }) // Set a delay based on the index of the data
        .style("opacity", 4);


    var text = group.append("text")
        .attr("x", function (d) { return parseInt((mapdata.allnodes[d.from].x + mapdata.allnodes[d.to].x) / 2) + 5; })
        .attr("y", function (d) { return parseInt((mapdata.allnodes[d.from].y + mapdata.allnodes[d.to].y) / 2) - 5; })
        .attr("class", "line-label")
        .style("opacity", 0);  // Set initial opacity to 0 for fade-in effect;


    // Add transitions for text
    text.transition()
        .duration(100)
        .delay(function (d, i) { return i * 100; })
        .style("opacity", 10);


    elements.selectAll("text")
        .text(function (d) { return mapdata.distances[d.from][d.to]; });


    elements.exit().remove();


};

function nodeClick(d, i) {
    console.log("node:click %s", i);
    console.log(d);

    d3.event.preventDefault();
    d3.event.stopPropagation();
};

function dragNodeStart() {
    return function (d, i) {
        console.log("dragging node " + i);

    };
};

function dragNode() {
    return function (d, i) {
        var node = d3.select(this);
        var position = d3.mouse(document.getElementById('svg'));
        var nodeDatum = {
            name: d.name,
            x: parseInt(position[0]),
            y: parseInt(position[1])
        };

        mapdata.allnodes[i] = nodeDatum;
        calculateDistancesbetweennodes();
        redrawLines();
        redrawNodes();
    };
};

function dragNodeEnd() {
    return function (d, i) {

        console.log("node " + i + " repositioned");
    };
};

function killEvent() {
    if (d3.event.preventDefault) {
        d3.event.preventDefault();
        d3.event.stopPropagation();
    }
};

function startEndPath(index) {
    d3.event.stopPropagation();
    d3.event.preventDefault();
    if (mapdata.getstate.fromNode === null) {
        mapdata.getstate.fromNode = index;
    }
    else {
        if (mapdata.getstate.fromNode === index) {

            return;
        }

        mapdata.getstate.toNode = index;
        var pathDatum = {
            id: mapdata.paths.length,
            from: mapdata.getstate.fromNode,
            to: index
        };
        mapdata.paths.push(pathDatum);
        calculateDistancesbetweennodes();
        redrawLines();
        redrawNodes();
        mapdata.getstate.fromNode = null;
        mapdata.getstate.toNode = null;
    }
};

function calculateDistancesbetweennodes() {


    mapdata.distances = [];
    for (var i = 0; i < mapdata.allnodes.length; i++) {
        mapdata.distances[i] = [];
        for (var j = 0; j < mapdata.allnodes.length; j++)
            mapdata.distances[i][j] = 'x';
    }


    for (var i = 0; i < mapdata.paths.length; i++) {

        var sourceNodeId = parseInt(mapdata.paths[i].from);
        var targetNodeId = parseInt(mapdata.paths[i].to);
        var sourceNode = mapdata.allnodes[sourceNodeId];
        var targetNode = mapdata.allnodes[targetNodeId];

        var xDistance = Math.abs(sourceNode.x - targetNode.x);
        var yDistance = Math.abs(sourceNode.y - targetNode.y);
        var distance = parseInt(Math.sqrt(Math.pow(xDistance, 2) + Math.pow(yDistance, 2)));

        mapdata.distances[sourceNodeId][targetNodeId] = distance;
        mapdata.distances[targetNodeId][sourceNodeId] = distance;




    };

};






function arePointsCounterClockwise(p1, p2, p3) {
    // Calculate vectors from p1 to p2 and p1 to p3
    const vector1 = {
        x: p2.x - p1.x,
        y: p2.y - p1.y,
    };

    const vector2 = {
        x: p3.x - p1.x,
        y: p3.y - p1.y,
    };
    // Calculate the cross product
    const crossProduct = vector1.x * vector2.y - vector1.y * vector2.x;

    // If the cross product is positive, the points are counter-clockwise.
    // If it's negative, they are clockwise.
    if (crossProduct > 0) {

    }
    else if (crossProduct < 0) {

    }
    else {
    }

    return crossProduct;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

