package config

import (
	"log"

	"github.com/caarlos0/env/v11"
)

type Config struct {
	DashboardAuthPass string `env:"WA_APP_AUTH_PASSWORD"`
	CommonProxy       string `env:"WA_COMMON_PROXY"`
	NumberProbeProxy  string `env:"WA_NUMBER_PROBE_PROXY"`
	RegistrationProxy string `env:"WA_REGISTRATION_PROXY"`
	PGDSN             string `env:"WA_APP_PG_DSN"`
	RedisURL          string `env:"WA_APP_REDIS_URL"`
}

func Load() Config {
	var cfg Config
	if err := env.Parse(&cfg); err != nil {
		log.Fatalf("load wa-app config: %v", err)
	}
	return cfg
}
