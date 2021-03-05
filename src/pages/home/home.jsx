import React, { Component } from "react";
import axios from "axios";
import L from "leaflet";
import "./leaflet_minimaps";
import "./css/leaflet.css";
import "../../App.css";

class Home extends Component {
  state = {
    basemaps: [],
    id: 0,
  };

  parseXml = (xml, arrayTags) => {
    let dom = null;
    dom = new DOMParser().parseFromString(xml, "text/xml");

    function parseNode(xmlNode, result) {
      if (xmlNode.nodeName === "#text") {
        let v = xmlNode.nodeValue;
        if (v.trim()) result["#text"] = v;
        return;
      }

      let jsonNode = {},
        existing = result[xmlNode.nodeName];
      if (existing) {
        if (!Array.isArray(existing))
          result[xmlNode.nodeName] = [existing, jsonNode];
        else result[xmlNode.nodeName].push(jsonNode);
      } else {
        if (arrayTags && arrayTags.indexOf(xmlNode.nodeName) !== -1)
          result[xmlNode.nodeName] = [jsonNode];
        else result[xmlNode.nodeName] = jsonNode;
      }

      if (xmlNode.attributes)
        for (let attribute of xmlNode.attributes)
          jsonNode[attribute.nodeName] = attribute.nodeValue;

      for (let node of xmlNode.childNodes) parseNode(node, jsonNode);
    }

    let result = {};
    for (let node of dom.childNodes) parseNode(node, result);

    return result;
  };

  setId = (id) => {
    this.setState({ id });
  };

  compare = (a, b) => {
    if (a.url.includes("pixel")) {
      return -1;
    } else if (b.url.includes("pixel")) {
      return 1;
    } else {
      return 0;
    }
  };

  async componentDidMount() {
    var { data } = await axios.get(
      "https://wmts.geo.admin.ch/EPSG/3857/1.0.0/WMTSCapabilities.xml"
    );

    var basemaps = this.parseXml(data).Capabilities.Contents.Layer.map((l) => {
      let time = l.Dimension.Default["#text"];
      let url = l.ResourceURL.template
        .replace("{Time}", time)
        .replace("TileMatrix", "z")
        .replace("TileCol", "x")
        .replace("TileRow", "y");
      let attribution =
        '<a title="Swiss Federal Office of Topography" href="https://www.swisstopo.admin.ch/">swisstopo</a>';
      let title = l["ows:Title"]["#text"];
      let description = l["ows:Abstract"]["#text"];
      return { url, attribution, title, description };
    });
    basemaps = basemaps.sort(this.compare);

    var baselayers = {};
    for (var i = 0; i < basemaps.length; i++) {
      baselayers[basemaps[i].title] = L.tileLayer(basemaps[i].url, {
        attribution: basemaps[i].attribution,
        id: i,
        description: basemaps[i].description,
      });
    }

    var center = [46.501, 7.992];
    if ("center" in this.props) {
      center = this.props.center;
    }
    var zoom = 10;
    if ("zoom" in this.props) {
      zoom = this.props.zoom;
    }

    this.map = L.map("map", {
      preferCanvas: true,
      zoomControl: false,
      center: center,
      zoom: zoom,
      minZoom: 5,
      maxZoom: 15,
      maxBoundsViscosity: 0.5,
    });
    var map = this.map;

    L.tileLayer(
      "https://wmts20.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-grau/default/current/3857/{z}/{x}/{y}.jpeg",
      {
        attribution:
          '<a title="Swiss Federal Office of Topography" href="https://www.swisstopo.admin.ch/">swisstopo</a>',
      }
    ).addTo(map);

    baselayers[basemaps[0].title].addTo(map);

    L.control.layers
      .minimap(
        baselayers,
        {},
        {
          collapsed: false,
          setId: this.setId,
        }
      )
      .addTo(map);

    this.setState({ basemaps, id: 0 });
  }

  render() {
    var { basemaps, id } = this.state;
    document.title = "SwissTopo Basemaps";
    return (
      <React.Fragment>
        <div id="map" className="home">
          {basemaps.length > 0 && (
            <div className="description">
              <div className="title">{basemaps[id].title}</div>
              <div>{basemaps[id].description}</div>
              <div>{basemaps[id].url}</div>
            </div>
          )}
        </div>
      </React.Fragment>
    );
  }
}

export default Home;
