function lightboxImage( Lightbox ) {
    return {
        restrict: 'E',
        scope: {
            image: '@',
            thumb: '@'
        },
        controller: lightboxController,
        controllerAs: 'vm',
        templateUrl: 'lightboxImage.html',
        bindToController: true
    };

    function lightboxController() {
        var vm = this;
        vm.openLightbox = openLightbox;

        return vm;

        function openLightbox() {
            Lightbox.openModal( [{url: vm.image}], 0 );
        }
    }
}


