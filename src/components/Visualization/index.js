import React, { useRef, useEffect, useState } from 'react';
import { select, scaleLinear, selectAll } from 'd3';
import PropTypes from 'prop-types';
import constants from '../../static/constants';
import Legend from '../Legend';
import ProteinWindow from './ProteinWindow';

import './index.scss';

const CIRCLE_RADIUS = 5;
const SPINE_HEIGHT = 30;

const { COLOR_PALLETE } = constants;

const scaleMap = {
  1: 1,
  2: 2.5,
  3: 2,
  4: 1.9,
  5: 2,
  6: 2.2,
  7: 2.5,
  8: 2.9,
  9: 3.6,
  10: 4.6,
  11: 6.8,
  12: 12,
  13: 59,
  14: -15,
  15: -7
};

const calculateBondRanking = array => {
  const pairRanking = [];
  array.forEach((pair, idx) => {
    let total = 1;
    const [low, high] = pair;
    for (let i = 0; i < array.length; i += 1) {
      if (idx !== i) {
        const [currLow, currHigh] = array[i];
        if (low < currLow && high > currHigh) {
          total += 1;
        }
        if (low < currLow && high > currLow && high < currHigh) {
          total += 0.7;
        }
        if (low > currLow && low < currHigh && high > currHigh) {
          total += 0.75;
        }
      }
    }
    pairRanking.push(total);
  });
  return pairRanking;
};

function Visualization(props) {
  const {
    height,
    width: initialWidth,
    currSelection,
    isLegendOpen,
    initialOptions,
    scaleFactor,
    fullScale,
    setFullScaleDisabled
  } = props;

  const {
    disulfideBonds,
    glycoslation,
    length: proteinLength
  } = initialOptions[currSelection];

  const svgRef = useRef(null);
  const windowSvgRef = useRef(null);
  const [windowPos, setWindowPos] = useState({ start: 0, end: proteinLength });
  const { start: windowStart, end: windowEnd } = windowPos;
  const [windowView, setWindowView] = useState(false);
  const [showGlyco, setShowGlyco] = useState(true);
  const [showDisulfide, setShowDisulfide] = useState(true);

  const scaleVisualization = scaleFactor !== 1;
  const SCALE_FACTOR = scaleVisualization ? scaleFactor : 1;
  const width = initialWidth * SCALE_FACTOR;

  const margin = {
    top: height / 15,
    right: width / 15,
    bottom: height / 15,
    left: width / 15
  };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const SULFIDE_POS = innerHeight / 2 + SPINE_HEIGHT / 2;
  const SULFIDE_BOND_LENGTH = 40;
  const SULFIDE_ATOM_OFFSET = 20;
  const GLYCO_STEM_LENGTH = 60;
  const GLYCO_LINK_LENGTH = 10;
  const SPINE_START_POS = SCALE_FACTOR * 0.5 * margin.left;
  const WINDOW_SPINE_START_POS = (0.5 * initialWidth) / 15;

  const SPINE_WIDTH = scaleVisualization
    ? innerWidth + SPINE_START_POS
    : innerWidth + SPINE_START_POS;

  const WINDOW_SPINE_WIDTH = initialWidth - (2 * initialWidth) / 15;

  const glycoBonds = initialOptions[currSelection].disulfideBonds.map(pair => {
    const bondPos = [];
    const atoms = pair.split(' ');
    atoms.forEach(el => {
      const atom = parseInt(el, 10);
      bondPos.push(atom);
    });
    return bondPos;
  });

  const updateWindowStart = newStart => {
    setWindowPos({ ...windowPos, start: newStart });
  };

  const updateWindowEnd = newEnd => {
    setWindowPos({ ...windowPos, end: newEnd });
  };

  if (proteinLength < 3000) {
    setFullScaleDisabled(true);
  } else {
    setFullScaleDisabled(false);
  }
  const pairRanking = calculateBondRanking(glycoBonds);

  const xScale = scaleLinear()
    .domain([0, proteinLength])
    .range([
      fullScale ? 0 : SPINE_START_POS,
      fullScale ? proteinLength : SPINE_WIDTH
    ]);

  const windowScale = scaleLinear()
    .domain([windowStart, windowEnd])
    .range([
      fullScale ? 0 : WINDOW_SPINE_START_POS,
      fullScale ? proteinLength : WINDOW_SPINE_WIDTH
    ]);

  const toggleWindowView = () => {
    setWindowView(!windowView);
  };

  const bondHeight = idx => {
    const bHeight = SULFIDE_POS + SULFIDE_BOND_LENGTH * pairRanking[idx];
    return bHeight;
  };

  const attachGlycoBonds = (g, isWindowView) => {
    let gBonds = glycoslation.map(el => parseInt(el, 10));
    if (isWindowView) {
      gBonds = gBonds.filter(bond => bond >= windowStart && windowEnd);
    }
    const scale = isWindowView ? windowScale : xScale;
    gBonds.forEach(el => {
      const atom = g.append('text');

      atom
        .attr('dx', scale(el) - 5)
        .attr('dy', SULFIDE_POS + 5)
        .text(() => `N`)
        .attr('class', 'glyco-labels');

      const pos = g.append('text');
      pos
        .attr('dx', scale(el) + 3)
        .attr('dy', SULFIDE_POS + 7)
        .text(() => `${el}`)
        .attr('class', 'glyco-labels--pos');

      const stem = g.append('line');
      stem
        .attr('x1', scale(el))
        .attr('y1', SULFIDE_POS - 10)
        .attr('x2', scale(el))
        .attr('y2', SULFIDE_POS - GLYCO_STEM_LENGTH)
        .style('stroke', 'black');

      const mol1 = g.append('circle');
      mol1
        .attr('cx', scale(el))
        .attr('cy', SULFIDE_POS - GLYCO_STEM_LENGTH)
        .attr('r', CIRCLE_RADIUS + 3)
        .style('stroke', 'black')
        .style('fill', 'black');

      const link = g.append('line');
      link
        .attr('x1', scale(el))
        .attr('y1', SULFIDE_POS - GLYCO_STEM_LENGTH)
        .attr('x2', scale(el))
        .attr('y2', SULFIDE_POS - GLYCO_STEM_LENGTH - GLYCO_LINK_LENGTH * 2)
        .style('stroke', 'black');

      const link2 = g.append('line');
      link2
        .attr('x1', scale(el))
        .attr('y1', SULFIDE_POS - GLYCO_STEM_LENGTH - GLYCO_LINK_LENGTH * 2)
        .attr('x2', scale(el))
        .attr('y2', SULFIDE_POS - GLYCO_STEM_LENGTH - GLYCO_LINK_LENGTH * 3.5)
        .style('stroke', 'black');
      const link3 = g.append('line');
      link3
        .attr('x1', scale(el))
        .attr('y1', SULFIDE_POS - GLYCO_STEM_LENGTH - GLYCO_LINK_LENGTH * 3.5)
        .attr('x2', scale(el))
        .attr('y2', SULFIDE_POS - GLYCO_STEM_LENGTH - GLYCO_LINK_LENGTH * 4.5)
        .style('stroke', 'black');

      const mol2 = g.append('circle');
      mol2
        .attr('cx', scale(el))
        .attr('cy', SULFIDE_POS - GLYCO_STEM_LENGTH - GLYCO_LINK_LENGTH * 2)
        .attr('r', CIRCLE_RADIUS + 3)
        .style('stroke', 'black')
        .style('fill', 'grey');

      const mol3 = g.append('rect');
      mol3
        .attr('width', 14)
        .attr('height', 14)
        .attr('x', scale(el) - 7)
        .attr('y', SULFIDE_POS - GLYCO_STEM_LENGTH - GLYCO_LINK_LENGTH * 5)
        .style('fill', 'white')
        .style('stroke', 'black');
    });
  };

  const attachSulfides = (g, isWindowView) => {
    let bonds = disulfideBonds.map(pair => {
      const bondPos = [];
      const atoms = pair.split(' ');
      atoms.forEach(el => {
        const atom = parseInt(el, 10);
        bondPos.push(atom);
      });
      return bondPos;
    });

    const scale = isWindowView ? windowScale : xScale;
    if (isWindowView) {
      bonds = bonds.filter(bond => {
        const [x, y] = bond;
        return x >= windowStart && y <= windowEnd;
      });
    }

    bonds.forEach((pair, idx) => {
      const [x, y] = pair;
      pair.forEach(el => {
        const atom = g.append('circle');
        atom
          .attr('cx', scale(el))
          .attr('cy', SULFIDE_POS)
          .attr('r', CIRCLE_RADIUS)
          .style('stroke', 'black')
          .style('fill', COLOR_PALLETE[idx % COLOR_PALLETE.length]);

        const bond = g.append('line');
        bond
          .attr('x1', scale(el))
          .attr('y1', SULFIDE_POS + 20)
          .attr('x2', scale(el))
          .attr('y2', bondHeight(idx))
          .style('stroke', 'black');
        const sulfide = g.append('text');
        sulfide
          .attr('dx', scale(el) - 5)
          .attr('dy', bondHeight(idx) + SULFIDE_ATOM_OFFSET)
          .text(() => 'S');

        const pos = g.append('text');
        pos
          .attr('dx', scale(el) + 4)
          .attr('dy', bondHeight(idx) + SULFIDE_ATOM_OFFSET + 5)
          .text(() => `${el}`)
          .attr('class', 'sulfide-labels--pos');
      });
      const link = g.append('line');
      link
        .attr('x1', scale(x))
        .attr('y1', bondHeight(idx))
        .attr('x2', scale(y))
        .attr('y2', bondHeight(idx))
        .style('stroke', 'black');
    });
  };

  const attachSpine = (g, isWindowView) => {
    const spineBase = g.append('rect');
    let spineWidth = fullScale ? proteinLength : innerWidth;
    if (isWindowView) {
      spineWidth = WINDOW_SPINE_WIDTH;
      console.log('attachSpine -> innerWidth', innerWidth);
      console.log('attachSpine -> spineWidth', spineWidth);
      console.log('spine start pos', SPINE_START_POS);
      console.log(
        'attachSpine -> WINDOW_SPINE_START_POS',
        WINDOW_SPINE_START_POS
      );
    }
    spineBase
      .attr('width', spineWidth)
      .attr('height', SPINE_HEIGHT)
      .attr('x', isWindowView ? WINDOW_SPINE_START_POS : SPINE_START_POS)
      .attr('y', innerHeight / 2)
      .style('fill', 'white')
      .style('stroke', 'black');
  };

  const attachNTerminus = g => {
    const NTerm = g.append('text');
    NTerm.attr('dx', SPINE_START_POS - 50)
      .attr('dy', innerHeight / 2 + 20)
      .text(() => 'NH2--');
  };

  const renderVisualization = (id, isWindowView) => {
    const svg = select(id);
    svg.style('background-color', 'white');

    const translateX = isWindowView ? initialWidth / 15 : margin.left;
    const translateY = isWindowView ? initialWidth / 15 : margin.top;

    const g = svg.append('g');
    g.attr('transform', `translate(${translateX}, ${translateY})`);
    attachSpine(g, isWindowView);
    if (showDisulfide) {
      attachSulfides(g, isWindowView);
    }
    if (showGlyco) {
      attachGlycoBonds(g, isWindowView);
    }
    if (!isWindowView) {
      attachNTerminus(g);
    }
  };

  const removeElements = () => {
    const svgEls = ['text', 'line', 'circle', 'rect'];
    svgEls.forEach(el => {
      const allNodes = selectAll(el);
      allNodes.remove();
    });
  };

  useEffect(() => {
    removeElements();
    renderVisualization('#svg');
    renderVisualization('#windowSvg', true);
    if (scaleFactor !== 1) {
      document.getElementById('svg').style.marginLeft =
        innerWidth / scaleMap[scaleFactor];
      // document.getElementById('windowSvg').style.marginLeft =
      //   -WINDOW_SPINE_WIDTH / scaleMap[scaleFactor];
    } else if (fullScale) {
      document.getElementById('svg').style.marginLeft =
        0.95 * proteinLength + 2 * margin.left;
    } else {
      document.getElementById('svg').style.marginLeft = 0;
    }
  }, [
    svgRef.current,
    showDisulfide,
    showGlyco,
    scaleVisualization,
    scaleFactor,
    fullScale,
    windowStart,
    windowEnd
  ]);

  // useEffect(() => {
  //   removeElements();
  //   renderVisualization('#svg');
  //   renderVisualization('#windowSvg', true);
  //   if (scaleFactor !== 1) {
  //     document.getElementById('svg').style.marginLeft =
  //       innerWidth / scaleMap[scaleFactor];
  //   } else if (fullScale) {
  //     document.getElementById('svg').style.marginLeft =
  //       0.95 * proteinLength + 2 * margin.left;
  //   } else {
  //     document.getElementById('svg').style.marginLeft = 0;
  //   }
  // }, [
  //   windowSvgRef.current,
  //   windowStart,
  //   windowEnd,
  //   scaleVisualization,
  //   scaleFactor,
  //   fullScale
  // ]);

  const svg = Number.isInteger(currSelection) ? (
    <svg
      height={`${height}`}
      width={`${
        fullScale ? proteinLength + margin.left * 2 : width + margin.left
      }`}
      ref={svgRef}
      id="svg"
      overflow="visible"
    >
      <rect />
    </svg>
  ) : null;

  const windowSvg = Number.isInteger(currSelection) ? (
    <div className="windowSvg--wrapper">
      <svg
        height={`${height}`}
        width={`${initialWidth}`}
        ref={windowSvgRef}
        id="windowSvg"
        overflow="visible"
      >
        <rect />
      </svg>
    </div>
  ) : null;

  return (
    <div className="svg-wrapper">
      {isLegendOpen ? (
        <Legend
          glycoslation={glycoslation}
          disulfideBonds={disulfideBonds}
          toggleGlyco={setShowGlyco}
          toggleSulfide={setShowDisulfide}
          length={proteinLength}
        />
      ) : null}
      {svg}
      <ProteinWindow
        length={proteinLength}
        updateWindowStart={updateWindowStart}
        updateWindowEnd={updateWindowEnd}
      />
      {windowSvg}
    </div>
  );
}

Visualization.propTypes = {
  isLegendOpen: PropTypes.bool,
  initialOptions: PropTypes.arrayOf(PropTypes.object).isRequired,
  height: PropTypes.number,
  width: PropTypes.number,
  currSelection: PropTypes.number.isRequired,
  scaleFactor: PropTypes.number,
  fullScale: PropTypes.bool,
  setFullScaleDisabled: PropTypes.func
};

Visualization.defaultProps = {
  isLegendOpen: false,
  setFullScaleDisabled: () => {},
  scaleFactor: 1,
  fullScale: false,
  height: 500,
  width: 500
};

export default Visualization;
