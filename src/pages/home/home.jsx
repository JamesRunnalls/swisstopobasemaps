import React, { Component } from "react";
import axios from "axios";
import L from "leaflet";
import "./leaflet_minimaps";
import "./css/leaflet.css";
import "../../App.css";
import logo from "./img/logo.svg";
import mg from "./img/mg.svg";

class Home extends Component {
  state = {
    basemaps: [],
    id: 0,
    legend: false,
    search: "",
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

  updateSearch = (event) => {
    var search = event.target.value;
    this.minimap.filter(search);
    this.setState({ search });
  };

  toggleLegend = () => {
    this.setState({ legend: !this.state.legend });
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
      let legend = false;
      if ("LegendURL" in l["Style"]) {
        legend = l["Style"]["LegendURL"]["xlink:href"];
      }
      return { url, attribution, title, description, legend };
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

    this.minimap = L.control.layers
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
    var { basemaps, id, legend, search } = this.state;
    document.title = "SwissTopo Basemaps";
    return (
      <React.Fragment>
        <div id="map" className="home">
          <div className="logo">
            <img src={logo} alt="Logo" />
          </div>
          <div className="search">
            <input
              value={search}
              onChange={this.updateSearch}
              type="text"
              placeholder="Search for a map"
            ></input>
            <img src={mg} alt="manifying glass" />
          </div>
          {basemaps.length > 0 && (
            <React.Fragment>
              {basemaps[id].legend && (
                <div className="legend">
                  <button onClick={this.toggleLegend}>Legend</button>
                  <div
                    className={legend ? "legend-image" : "legend-image hide"}
                  >
                    <img src={basemaps[id].legend} alt="Legend" />
                  </div>
                </div>
              )}
              <div className="description">
                <div className="title">{basemaps[id].title}</div>
                <div>{basemaps[id].description}</div>
                <div className="url">
                  <div>
                    <div className="blue">L.</div>
                    <div className="yellow">tileLayer</div>(
                  </div>
                  <div>
                    <div className="orange" style={{ paddingLeft: "10px" }}>
                      "{basemaps[id].url}",
                    </div>
                  </div>
                  <div style={{ paddingLeft: "10px" }}>&#123;</div>
                  <div>
                    <div className="blue" style={{ paddingLeft: "20px" }}>
                      attribution:
                    </div>
                    <div>
                      <div className="orange" style={{ paddingLeft: "30px" }}>
                        '&lt;a title="Swiss Federal Office of Topography"
                        href="https://www.swisstopo.admin.ch/"&gt;swisstopo&lt;/a&gt;'
                      </div>
                    </div>
                  </div>
                  <div style={{ paddingLeft: "10px" }}>&#125;</div>
                  <div>
                    ).<div className="yellow">addTo</div>(
                    <div className="blue">map</div>);
                  </div>
                </div>
              </div>
            </React.Fragment>
          )}
        </div>
      </React.Fragment>
    );
  }
}

export default Home;
