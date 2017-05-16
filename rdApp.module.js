angular
    .module( 'rdApp', [ 'ymaps', 'ngSanitize' ] )
    .service( 'KidsTrack', KidsTrack )
    .service( 'Spots', Spots )
    .service( 'News', News )
    .controller( 'newsController', newsController )
    .controller( 'spotsController', spotsController )
    .controller( 'mapController', mapController );

function KidsTrack( $http ) {
    var url = "/rda/kidsTrack.json";
        
    var kt = { load: load };
    
    return kt;

    function load() {
        return $http.get( url, { cache: false } )
            .then( function( response ) {
                var ts = moment( response.data.ts )
                    .format( 'DD MMM HH:mm' );
                return { coords: [ response.data.lat, response.data.lng ],
                         ts: ts };
            } );
    }
}

function Spots( $http ) {
    var url = "/rda/spots.json";
        
    var s = { load: load };
    
    return s;

    function load() {
        return $http.get( url, { cache: false } )
            .then( function( response ) {
                return response.data;
            } );
    }
}


function News( $http ) {
    var url = "/rda/news.json";
        
    var s = { load: load };
    var lm = null;
    
    return s;

    function load() {
        return $http.get( url, { cache: false } )
            .then( function( response ) {
                if ( ( lm == null || lm != response.headers( 'last-modified' ) ) && 
                        response.data ) {
                    lm = response.headers( 'last-modified' ); 
                    return response.data;
                } else
                    return false;
            } );
    }
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

