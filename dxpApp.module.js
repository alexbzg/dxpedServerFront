angular
    .module( 'dxpApp', [ 'ymaps', 'ngSanitize' ] )
    .factory( 'DataServiceFactory', DataServiceFactory )
    .service( 'KidsTrack', KidsTrack )
    .service( 'Spots', Spots )
    .service( 'News', News )
    .service( 'Tabs', Tabs )
    .service( 'Status', Status )
    .controller( 'newsController', newsController )
    .controller( 'spotsController', spotsController )
    .controller( 'mapController', mapController )
    .controller( 'tabsController', tabsController )
    .controller( 'statusController', statusController )
    .controller( 'checkController', checkController )
    .controller( 'logController', logController )
    .controller( 'chatController', chatController )
  
   ;

function KidsTrack( $http ) {
    var s = DataServiceFactory( "/rda/kidsTrack.json" );
    s.processData = processData;
        
    return s;

    function processData() {

        var ts = moment( s.data.ts )
            .format( 'DD MMM HH:mm' );
        s.data = { coords: [ s.data.lat, s.data.lng ],
                    ts: ts };
    }
}

function Spots( DataServiceFactory ) {
    return DataServiceFactory( "/rda/spots.json" );
}

function Status( DataServiceFactory ) {
    return DataServiceFactory( "/rda/status.json" );
}


function Tabs() {
    var active = 'map';
    return {
        active: function() { return active; },
        setActive: function(value) { active = value; }
    };
}

function DataServiceFactory( $http ) {
    return createDataService;

    function createDataService( url ) {
        var s = { lm: null,
            load: load,
            data: null,
            url: url,
            processData: function() {} 
        };
        return s;

        function load() {
            return $http.get( s.url )
                .then( loadComplete )
                .catch( loadFailed );
        }

        function loadComplete( response ) {
            if ( ( s.lm == null || s.lm != response.headers( 'last-modified' ) ) && 
                    response.data ) {
                s.lm = response.headers( 'last-modified' ); 
                s.data = response.data;
                s.processData();
                return s.data;
            } else
                return false;
        }

        function loadFailed( error ) {
            console.log( s.url + ' XHR failed: ' + error.data );
        }
    }
}

function News( DataServiceFactory ) {
    return DataServiceFactory(  "/rda/news.json" );
}

function newsController( News, $interval ) {
    var vm = this;

    loadNews();
    $interval( loadNews, 60000 );
    
    return vm;

    function loadNews() {
        News.load()
            .then( function( data ) {
                    if ( data )
                        vm.news = data;
                });
    }

}

function tabsController( Tabs ) {
    var vm = this;
    vm.active = Tabs.active;
    vm.setActive = Tabs.setActive;
    return vm;
}

function logController() {
    var vm = this;
    return vm;
}

function chatController() {
    var vm = this;
    return vm;
}

function checkController() {
    var vm = this;
    return vm;
}

function statusController( Status, $interval ) {
    var vm = this;

    loadStatus();
    $interval( loadStatus, 60000 );

    return vm;

    function loadStatus() {
        Status.load()
            .then( function( data ) {
                if (data)
                    vm.status = data;
            });
    }

}


function spotsController( Spots, $interval ) {
    var vm = this;

    loadSpots();
    $interval( loadSpots, 60000 );
    
    return vm;

    function loadSpots() {
        Spots.load()
            .then( function( data ) {
                vm.spots = data;
                });
    }

}

function mapController( KidsTrack, $interval ) {
    var vm = this;

    vm.map = {
        center: [ 40, 50 ],
        zoom: 11};
    
    loadTrackData();
    $interval( loadTrackData, 120000 );

    function loadTrackData() {
        KidsTrack.load()
            .then( function( data ) {
                vm.map.center = data.coords;
                vm.current = data;
                    });
    }

    return vm;
}

