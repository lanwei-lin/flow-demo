import '../sass/style.scss';
import 'babel-polyfill'
import flow from './flow.js';
import $ from 'jquery';

$(function () {
    var data = [{
        name: 'Customer',
        data: [{
            closable: true,
            hasDetail: true,
            content: '<div>ZORC -> Order Confirmation Idoc (ORDESP)</div><div>ZBA5 -> Order Confirmation by email</div><div>ZBA7 -> Order Confirmation by email</div>'
        }, {
            closable: true,
            hint: '<p>1、Requested Delivery Data at Header copied to Lines</p><p>2、Time-slot/s</p><p>3、Route determination at line level according to Customer Departure point and SO size (Customising)</p>'
        }, {closable: true}, {closable: true}]
    }, {
        name: 'ATLAS',
        data: [{
            isMain: true,
            footer: 'Sales Ord',
            hint: '<p>1、Requested Delivery Data at Header copied to Lines</p><p>2、Time-slot/s</p><p>3、Route determination at line level according to Customer Departure point and SO size (Customising)</p>'
        }, {isMain: true}, {isMain: true}, {isMain: true}, {isMain: true}]
    }, {
        name: 'LADS',
        data: [{closable: true}, {closable: true}, {closable: true}]
    }, {
        name: 'WARE-HOUSE',
        data: [{closable: true}, {closable: true}, {closable: true}, {closable: true}]
    }];

    var option = {
        color: {
            title: ['#ffcd33', '#41a2d8', '#8a8ad6', '#7accf4'],
            content: ['#eba933', '#00589a', '#605d89', '#4895c5']
        }
    };

    window.demo = flow.init('.content', data, option);

    demo.resize(() => {
        start();
    });
    start();

});

function start() {
    var lines = [{
        start: [0, 0], end: [1, 0], text: 'output', both: true
    }, {
        start: [1, 0], end: [0, 1], text: 'output'
    }, {
        start: [1, 2], end: [3, 1], text: 'output'
    }, {
        start: [1, 3], end: [0, 2], text: 'output'
    }, {
        start: [1, 4], end: [0, 3], text: 'output'
    }, {
        start: [1, 0], end: [2, 0], text: 'output'
    }, {
        start: [1, 3], end: [2, 1], text: 'output'
    }, {
        start: [3, 2], end: [1, 3], text: 'output'
    }, {
        start: [1, 4], end: [2, 2], text: 'output'
    }, {
        start: [1, 4], end: [3, 3], text: 'output'
    }, {
        start: [1, 0], end: [1, 1], text: 'output',both: true
    }, {
        start: [1, 1], end: [1, 2], text: 'output'
    }, {
        start: [1, 2], end: [1, 3], text: 'output'
    }, {
        start: [1, 3], end: [1, 4], text: 'output'
    }, {
        start: [0, 0], end: [3, 2]
    }, {
        start: [1, 1], end: [3, 0], text: 'output'
    }];

    demo.draw(lines);
}