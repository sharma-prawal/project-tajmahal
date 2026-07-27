import { Lighting } from './Lighting';
import { SkyAndFog } from './SkyAndFog';
import { SceneEnvironmentMap } from './SceneEnvironmentMap';
import { ContactShadowsGround } from './ContactShadowsGround';
import { Greybox } from '@components/environment/greybox/Greybox';
import { AtmosphericParticles } from '@core/atmosphere/AtmosphericParticles';
import { AmbientLife } from '@core/ambient/AmbientLife';

/** Composition root for everything that furnishes the world but isn't gameplay. */
export function Environment() {
  return (
    <>
      <Lighting />
      <SkyAndFog />
      <SceneEnvironmentMap />
      <ContactShadowsGround />
      <Greybox />
      <AtmosphericParticles />
      <AmbientLife />
    </>
  );
}
