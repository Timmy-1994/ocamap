abstract class BaseCluster extends L.Layer implements ILayer{

    id: string
    type: string
    title: string
    catelog: { label: string; value: string }[]
    tag: string[]
    visible: boolean
    opacity: number
    dataSet: { label: string; value: string }[]

    icon?: string
    lyrOpts:any

    markerClusterGroup:L.MarkerClusterGroup
    iconIns:L.Icon|L.DivIcon

    constructor({
        id,
        type,
        title,
        visible,
        catelog,
        opacity,
        dataSet,
        ...lyrOpts
    }){
        super()
        this.catelog = catelog
        this.id = id
        this.type = type
        this.title = title
        this.visible = visible
        this.opacity = 1
        this.icon = lyrOpts.layerOption.icon
        this.lyrOpts = lyrOpts
        this.dataSet = dataSet 
        this.iconIns = L.divIcon({
            html:`
                <div class="leaflet-mark-icon">
                    <i class="${this.lyrOpts.layerOption.icon}"></i>
                </div>
            `
        })

        this.markerClusterGroup = L.markerClusterGroup({
            iconCreateFunction: cluster=> this.iconIns,
            showCoverageOnHover:false,
            spiderLegPolylineOptions: {opacity:0}
        })

    }

    async fetchData(){
        return await(await fetch(this.lyrOpts.url)).json()
    }
    onRemove(map){
        this.markerClusterGroup.removeFrom(map)
        return this
    }    
    
    abstract onAdd(map:L.Map):this
}

export class clusterMarkerLayer extends BaseCluster{
    data:any
    constructor(opts){
        super(opts)
    }
    private _pointToLayer(feature, latlng):L.Marker{
        const mk = L.marker(latlng, {
            icon:this.iconIns
        })
        mk.on("click",()=>{
            this._map.fireEvent("markerClick", {
                layer: mk,
                result: feature
            })
        })
        return mk
    }
    onAdd(map){
        
        (async ()=>{
            if(!this.data) this.data = await this.fetchData()
            const geojson = L.geoJSON(this.data,{
                pointToLayer:this._pointToLayer.bind(this)
            })
            this.markerClusterGroup.addLayer(geojson).addTo(map)
            this.fireEvent("loaded")
        })()

        return this
    }
    
}

export class IsoheStationLayer extends BaseCluster {

    data:any

    constructor(opts){
        super(opts)
    }

    onAdd(map){
        (async ()=>{
            if(!this.data) this.data = await this.fetchData()
            for (const {DataSet,Name} of this.data.Stations) {
                for (const k of Object.keys(DataSet)) {
                    const {Data,location} = DataSet[k]
                    const {Latitude,Longitude} = location
                    const mk = L.marker(
                        L.latLng(Latitude,Longitude),{
                            icon:this.iconIns
                        }
                    )
                    mk.on("click",()=>{
                        let result  = {
                            title:"",
                            type:"",
                            data:Data
                        }
                        if(/tide/ig.test(k)){
                            result.title = Name+"潮汐"
                            result.type = "tide"
                        }else if(/history/ig.test(k)){
                            result.title = Name+"波浪及海流"
                            result.type = "wave"
                        }else if(/wind/ig.test(k)){
                            result.title = Name+"風向"
                            result.type = "wind"
                        }
                        this._map.fireEvent("markerClick",{
                            layer: mk,
                            result
                        })
                    })
                    this.markerClusterGroup.addLayer(mk)
                }
            }
            this.markerClusterGroup.addTo(map)
            this.fireEvent("loaded")
        })()
        return this
    }
}

/** 
 * TODO: 列出各縣市 1 個 ICON > 點擊後 再載入屬於該縣市的 觀光景點資訊
 */
export class ScenicSpotLayer extends BaseCluster {
    data:any

    constructor(opts){
        super(opts)
    }
    
    private _pointToLayer(feature, latlng){

        const mk = L.marker(latlng, {
            icon:this.iconIns
        })

        const {
            Name,
            Toldescribe,
            Picture1,
            Picture2,
            Picture3,
            Py,Px
        } = feature.properties

        // mk.bindPopup(`
        //     <h3>${Name}</h3>
        //     <small>
        //         經度 ${Px} 緯度 ${Py}
        //     </small>
        //     <img src="${Picture1||Picture2||Picture3}" alt="${Name}"/>
        //     ${Name}
        //     ${Toldescribe}
        // `, {
        //     maxHeight: 300
        // })
        
        mk.on("click",()=>{
            this._map.fireEvent("markerClick",{
                type: this.type,
                layer: mk,
                data:{
                    Name,
                    Toldescribe,
                    Picture1,
                    Picture2,
                    Picture3,
                    Py,Px
                }
            })
        })
        return mk
    }

    onAdd(map){
        (async ()=>{

            if(!this.data) this.data = await this.fetchData()

            const geojson = L.geoJSON(this.data,{
                pointToLayer:this._pointToLayer.bind(this)
            })

            this.markerClusterGroup.addLayer(geojson).addTo(map)
            this.fireEvent("loaded")
        })()
        return this
    }
}