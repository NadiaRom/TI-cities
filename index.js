const $ = require('jquery'),
    d3 = require('d3'),
    tippy = require('tippy.js'),
    chroma = require('chroma-js'),
    topojson = require('topojson');

const cols = {
    font: 'rgb(51, 51, 49)',
    bg: '#ffffff',
};

const rankCols = {
    b: 'rgb(30, 149, 239)',
    c: 'rgb(8, 168, 186)',
    d: 'rgb(3, 165, 86)',
    e: 'rgb(100, 187, 65)',
    f: 'rgb(197, 212, 50)',
    g: 'rgb(253, 220, 34)',
    h: 'rgb(251, 153, 41)',
    i: 'rgb(242, 85, 53)',
    j: 'rgb(245, 61, 61)',
};

const getRank = function (p) {
    if (p >= 90) return 'a';
    if (p >= 80) return 'b';
    if (p >= 70) return 'c';
    if (p >= 65) return 'd';
    if (p >= 60) return 'e';
    if (p >= 55) return 'f';
    if (p >= 50) return 'g';
    if (p >= 40) return 'h';
    if (p >= 20) return 'i';
    if (p >= 0) return 'j';
};

const nform = d => d3.format(',.6r')(d).replace(/\..*/, '');
const mobW = 577;

const fontSize = parseInt($('body').css('font-size'));

const numericalize = function (d) {
    for (const k in d) {
        if (d[k].search(/[^0-9\.]/) === -1) {
            d[k] = +d[k];
        } else if (['True', 'False'].indexOf(d[k]) >= 0) {
            d[k] = d[k] === 'True';
        }
    }
    return d;
};

const getPointOnCircle = function (deg, r, cx, cy) {
    const radians = deg * Math.PI / 180
    return [
        r * Math.cos(radians) + cx,
        r * Math.sin(radians) + cy,
    ];
};

const scaleCircle = d3.scalePoint()
    .domain([
        'Інформація про роботу ОМС',
        'Бюджетний процес',
        'Доступ та участь',
        'Житлова політика',
        'Закупівлі',
        'Землекористування та будівельна політика',
        'Кадрові питання',
        'Комунальне майно',
        'Комунальні підприємства',
        'Освіта',
        'Професійна етика та конфлікт інтересів',
        'Соціальні послуги',
        'Фінансова та матеріальна допомога, гранти',
        '!technical!'
    ])
    .range([0, 360]);

Promise.all([
    d3.json('data/Ukraine.topojson'),
    d3.csv('data/data_long.csv', numericalize),
    d3.json('data/indicators_max.json', numericalize),
]).then(function ([tjson, data, indMax]) {
    let indValues = data.map(d => d.indicator);
    indValues = indValues.filter((d, i) => indValues.indexOf(d) === i)
        .sort(d => (d === 'Загальний бал') ? -1 : 1);
    
    const inds = d3.select('#cities_map #indicators')
        .selectAll('button.ind')
        .data(indValues)
        .enter()
        .append('button')
        .classed('ind', true)
        .classed('active', d => d === 'Загальний бал')
        .text(d => d);


    const $fig = $('#cities_map figure'),
        mapW = $fig.width(),
        mapH = $fig.height(),
        mapM = {
            top: fontSize, 
            right: fontSize,
            bottom: fontSize,
            left: fontSize,
        };
    
    const map = d3.select('#cities_map figure svg')
        .attr('height', mapH)
        .attr('width', mapW);

    const scaleR = d3.scaleLinear()
        .domain([0, 100])
        .range([1, mapW * 0.035]);
    
    const projection = d3.geoMercator()
        .fitSize(
            [mapW - mapM.left - mapM.right, mapH - mapM.top - mapM.bottom],
            topojson.feature(tjson, tjson.objects.regions)
        );
    
    const geopath = d3.geoPath(projection);
    const obls = map.selectAll('path.obl')
        .data(topojson.feature(tjson, tjson.objects.regions).features )
        .enter()
        .append('path')
        .classed('obl', true)
        .attr('d', geopath);

    const ukrTjson = topojson.feature(tjson, tjson.objects.countries);
    ukrTjson.features = ukrTjson.features.filter(d => d.id === 'UKR');

    const Ukr = map.append('path')
        .classed('country', true)
        .attr('d', geopath(ukrTjson));
    
    const nested = d3.nest()
        .key(d => d.city)
        .key(d => d.year)
        .entries(data);
    
    const cityGs = map.selectAll('g.city')
        .data(nested)
        .enter()
        .append('g')
        .classed('city', true);

    const cityGs2018 = cityGs.append('g')
        .datum(d => d.values
            .filter(v => v.key === '2018')[0].values
            .filter(v => v.indicator !== 'Загальний бал')
        )
        .classed('g2018', true);
    
    const cityFlower = cityGs2018.selectAll('path')
        .data(d => d)
        .enter()
        .append('path')
        .attr('d', function (d) {
            const [cx, cy] = projection([d.lon, d.lat]);
            const [rx, ry] = getPointOnCircle(
                scaleCircle(d.indicator),
                scaleR(d.value / indMax[d.indicator] * 100),
                cx, cy
            );
            return `M${cx} ${cy} L${rx} ${ry}`;
        })
        .style('stroke', d => rankCols[getRank(d.value / indMax[d.indicator] * 100)]);

    const zoomed = function () {
        map
            .selectAll('path.obl, path.country, g.city path')
            .attr('transform', d3.event.transform);
        
        debugger;
    };
    

    const zoom = d3.zoom()
        .scaleExtent([1, 7])
        .translateExtent([[-mapW*0.1, -mapH*0.1], [mapW*1.1, mapH*1.1]])
        .on('zoom', zoomed);
    
    map.call(zoom);
    
});