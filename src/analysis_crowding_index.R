library(lme4)
library(emmeans)
library(tidyverse)
library(patchwork)

setwd("d:/OneDrive/projects/MOT_anisotropy_code/data_clean/")

my_plot_theme <- theme(
  axis.title.x = element_text(color = "black", size = 14, face = "bold", margin = margin(t = 10)),
  axis.title.y = element_text(color = "black", size = 14, face = "bold", margin = margin(r = 10)),
  axis.text.x  = element_text(size = 12, face = "bold", color = "black"),
  axis.text.y  = element_text(size = 12, face = "bold", color = "black"),
  axis.line    = element_line(colour = "black", linewidth = 0.8),
  panel.border     = element_blank(),
  panel.grid.major = element_blank(),
  panel.grid.minor = element_blank(),
  panel.background = element_blank(),
  strip.text       = element_text(size = 12, face = "bold"),
  legend.title     = element_text(size = 12, face = "bold"),
  legend.text      = element_text(size = 10),
  plot.title       = element_text(size = 16, face = "bold"),
  plot.subtitle    = element_text(size = 12, color = "grey30"),
  panel.spacing    = unit(1.5, "lines")
)

zone_cols <- c("weak" = "#1a80bb", "strong" = "#f1a226")


# data
crowd <- read.csv("crowding_index.csv")

crowd$participant <- factor(crowd$participant)
crowd$cond <- factor(crowd$cond, levels = c("strong", "weak"))

crowd <- crowd %>%
  mutate(
    crowd_count.z = as.numeric(scale(crowd_count))
  )

m_count <- glmer(cbind(n_hits, n_errors) ~ crowd_count.z + (1 | participant),
                  data = crowd, family = binomial)


summary(m_count)

sjPlot::tab_model(
  m_count,
  p.style = 'scientific_stars',
  show.se = T,
  show.stat = T,
  digits = 3
) 



# --------------------plots-----------------------

# binned observed means (participant-level)

crowd <- crowd %>%
  mutate(
    bin = case_when(
      crowd_count == 0  ~ "0",
      crowd_count <= 8  ~ "3-8",
      crowd_count <= 13 ~ "9-13",
      crowd_count <= 18 ~ "14-18",
      TRUE              ~ "19-27"
    )
  )

bin_means <- crowd %>%
  group_by(participant, bin) %>%
  summarise(acc = sum(n_hits) / (5 * n()), .groups = "drop") %>%
  group_by(bin) %>%
  summarise(
    avg = mean(acc),
    sd  = sd(acc),
    n   = n()
  ) %>%
  mutate(
    sem = sd / sqrt(n),
    ci  = sem * qt((1 - 0.05) / 2 + .5, n - 1),
    ci_lower = avg - ci,
    ci_upper = avg + ci
  )

# place each bin at the mean encounter count of its trials
bin_pos <- crowd %>%
  group_by(bin) %>%
  summarise(x = mean(crowd_count))

bin_means <- bin_means %>%
  left_join(bin_pos, by = "bin")


p_crowd <- ggplot() +
  
  geom_point(
    data = crowd,
    aes(x = crowd_count, y = n_hits / 5, color = cond),
    position = position_jitter(width = 0.35, height = 0.025, seed = 1),
    alpha = 0.07,
    size = 1.2
  ) +
  
  geom_ribbon(
    data = newd,
    aes(x = crowd_count, ymin = lo, ymax = hi),
    fill = "grey60",
    alpha = 0.35
  ) +
  
  geom_line(
    data = newd,
    aes(x = crowd_count, y = fit),
    color = "black",
    linewidth = 1.3
  ) +
  
  geom_errorbar(
    data = bin_means,
    aes(x = x, ymin = ci_lower, ymax = ci_upper),
    width = 0.8,
    linewidth = 0.8,
    color = "black"
  ) +
  
  geom_point(
    data = bin_means,
    aes(x = x, y = avg),
    size = 3,
    color = "black"
  ) +
  
  geom_text(
    data = bin_means,
    aes(x = x, y = ci_lower - 0.05, label = bin),
    size = 4.5,
    fontface = "bold",
    color = "grey30"
  ) +
  
  scale_color_manual(values = zone_cols) +
  
  scale_y_continuous(labels = scales::percent_format(accuracy = 1),
                     breaks = c(0.5, 0.6, 0.7, 0.8, 0.9, 1)) +
  
  scale_x_continuous(breaks = c(0, 10, 20, 27)) +
  
  coord_cartesian(ylim = c(0.5, 1.02)) +
  
  labs(x = "Crowding encounters per trial",
       y = "Accuracy",
       color = "Interference") +
  
  my_plot_theme +
  
  theme(legend.background    = element_rect(fill = "white", color = NA),
        legend.title         = element_text(size = 14, face = "bold"),
        legend.text          = element_text(size = 13),
        legend.key.size      = unit(1.2, "lines")) +
  
  # theme(legend.position = "none") +
  
  guides(color = guide_legend(override.aes = list(size = 3, alpha = 1)))

p_crowd

# ggsave("crowding_binned_plot.svg", p_crowd, width = 5, height = 3.6, units = "in")


# need to run analysis_errors.R as well
# main_plot2 <- (p_errors | p_model |p_crowd) +
#   plot_layout(widths = c(1, 1, 1)) +
#   plot_annotation(tag_levels = "A") &
#   theme(plot.tag = element_text(size = 16, face = "bold"))
# 
# main_plot2
# 
# 
# ggsave(
#   filename = "error_plot.svg",
#   plot = main_plot,
#   width = 12,
#   height = 4,
#   units = "in"
# )


# per participant:
# ---- per-participant curves from the random-intercept model --------------
# shared population slope + participant-specific intercept (parallel curves)

cc_mean <- mean(crowd$crowd_count)
cc_sd   <- sd(crowd$crowd_count)

crowd$pid <- as.numeric(crowd$participant)

# one prediction grid per participant, restricted to each participant's
# observed encounter range (no extrapolation beyond their data)
pp_facet <- crowd %>%
  group_by(participant) %>%
  reframe(crowd_count = seq(min(crowd_count), max(crowd_count), length.out = 60)) %>%
  mutate(
    crowd_count.z = (crowd_count - cc_mean) / cc_sd,
    pid = as.numeric(participant)
  )

pp_facet$fit <- predict(m_count, newdata = pp_facet, type = "response")


# ---- facet plot ----------------------------------------------------------

p_facet <- ggplot() +
  
  geom_point(
    data = crowd,
    aes(x = crowd_count, y = n_hits / 5, color = cond),
    position = position_jitter(width = 0.5, height = 0.02, seed = 1),
    alpha = 0.5,
    size = 0.9
  ) +
  
  geom_line(
    data = pp_facet,
    aes(x = crowd_count, y = fit, group = participant),
    color = "black",
    linewidth = 0.5,
    alpha = 0.7
  ) +
  
  scale_color_manual(values = zone_cols) +
  scale_y_continuous(labels = scales::percent_format(accuracy = 1),
                     breaks = c(0, 0.2, 0.4, 0.6, 0.8, 1)) +
  scale_x_continuous(breaks = c(0, 10, 20, 27)) +
  
  facet_wrap(~ pid, ncol = 4) +
  
  labs(x = "Crowding encounters per trial",
       y = "Accuracy",
       color = "Interference") +
  
  my_plot_theme +
  
  theme(strip.text   = element_text(size = 9),
        axis.text    = element_text(size = 9),
        legend.title = element_text(size = 14, face = "bold"),
        legend.text  = element_text(size = 13),
        legend.key.size = unit(1.2, "lines")) +
  
  coord_cartesian(ylim = c(0.5, 1.02)) +
  
  guides(color = guide_legend(override.aes = list(size = 4, alpha = 1)))

p_facet

ggsave("crowding_facet_plot.svg", p_facet, width = 12, height = 12, units = "in")
